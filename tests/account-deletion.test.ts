import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("account deletion requires fresh own session and atomically cascades only that account", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  const sa = "33333333-3333-4333-8333-333333333333";
  const sb = "44444444-4444-4444-8444-444444444444";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid(),auth.jwt() to anon,authenticated;`);
    for (const file of [
      "20260923000100_dayflow_foundation.sql",
      "20260924000100_task_colors.sql",
      "20260928000100_routine_exceptions.sql",
      "20260929000100_task_icons_and_routine_colors.sql",
      "20261010000100_add_task_and_routine_privacy.sql",
      "20261010000200_add_timetable_shares.sql",
      "20261010000500_add_push_subscriptions.sql",
      "20261019000100_reliable_push_deliveries.sql",
      "20261027000100_feedback.sql",
      "20261027000200_account_deletion.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(`insert into auth.users values ('${a}'),('${b}');
      insert into auth.sessions values ('${sa}','${a}',now()-interval '1 hour'),('${sb}','${b}',now());`);
    for (const actor of [a, b]) {
      const [{ id: cat }] = (
        await db.query<{ id: string }>(
          "insert into public.categories(user_id,name) values ($1,'Category') returning id",
          [actor],
        )
      ).rows;
      const [{ id: routine }] = (
        await db.query<{ id: string }>(
          "insert into public.recurring_tasks(user_id,title,start_time,frequency,starts_on,category_id) values ($1,'Routine','09:00','daily','2026-10-01',$2) returning id",
          [actor, cat],
        )
      ).rows;
      const [{ id: task }] = (
        await db.query<{ id: string }>(
          "insert into public.tasks(user_id,title,category_id,recurring_task_id,occurrence_date) values ($1,'Task',$2,$3,'2026-10-27') returning id",
          [actor, cat, routine],
        )
      ).rows;
      await db.query(
        "insert into public.routine_exceptions(user_id,recurring_task_id,occurrence_date,is_skipped) values ($1,$2,'2026-10-28',true)",
        [actor, routine],
      );
      await db.query(
        "insert into public.timetable_shares(owner_id,starts_on,ends_on) values ($1,'2026-10-27','2026-10-28')",
        [actor],
      );
      const [{ id: sub }] = (
        await db.query<{ id: string }>(
          "insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ($1,$2,'key','auth') returning id",
          [actor, `https://example.com/${actor}`],
        )
      ).rows;
      await db.query(
        "insert into public.push_reminder_attempts(reminder_key,subscription_id,status,claim_token,lease_until) values ('test',$1,'pending',gen_random_uuid(),now())",
        [sub],
      );
      await db.query(
        "insert into public.push_reminder_deliveries(reminder_key) values ($1),($2)",
        [`task:${task}:date`, `routine:${routine}:date`],
      );
      await db.query(
        "insert into public.feedback(user_id,kind,message,app_version) values ($1,'feedback','Example feedback','2.0.0')",
        [actor],
      );
    }
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
    );
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${a}',false); select set_config('request.jwt.claims','{"session_id":"${sa}","iat":9999999999}',false);`,
    );
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
      /RECENT_SIGN_IN_REQUIRED/,
    );
    await db.exec(
      `reset role; update auth.sessions set created_at=now() where id='${sa}'; set role authenticated;`,
    );
    await assert.rejects(
      db.query("select public.delete_own_account('delete')"),
      /CONFIRM_DELETE_REQUIRED/,
    );
    await assert.rejects(
      db.query("select public.delete_own_account(null)"),
      /CONFIRM_DELETE_REQUIRED/,
    );
    await db.exec(
      `select set_config('request.jwt.claims','{"session_id":"${sb}"}',false);`,
    );
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
      /RECENT_SIGN_IN_REQUIRED/,
    );
    await db.exec(`select set_config('request.jwt.claims','{"session_id":"${sa}"}',false); reset role;
      create function public.block_test_delete() returns trigger language plpgsql as $$begin raise exception 'Simulated deletion failure';end$$;
      create trigger block_test_delete before delete on auth.users for each row execute function public.block_test_delete(); set role authenticated;`);
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
      /Simulated deletion failure/,
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.push_reminder_deliveries")).rows
        .length,
      4,
      "failed deletion rolls back legacy cleanup",
    );
    await db.exec(
      "drop trigger block_test_delete on auth.users; set role authenticated",
    );
    assert.equal(
      (
        await db.query<{ delete_own_account: boolean }>(
          "select public.delete_own_account('DELETE')",
        )
      ).rows[0].delete_own_account,
      true,
    );
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
      /RECENT_SIGN_IN_REQUIRED/,
    );
    await db.exec("reset role");
    for (const [table, owner] of [
      ["auth.users", "id"],
      ["auth.sessions", "user_id"],
      ["public.profiles", "id"],
      ["public.categories", "user_id"],
      ["public.tasks", "user_id"],
      ["public.recurring_tasks", "user_id"],
      ["public.routine_exceptions", "user_id"],
      ["public.timetable_shares", "owner_id"],
      ["public.push_subscriptions", "user_id"],
      ["public.feedback", "user_id"],
    ]) {
      const { rows } = await db.query<Record<string, string>>(
        `select ${owner} from ${table}`,
      );
      assert.deepEqual(rows, [{ [owner]: b }], table);
    }
    assert.equal(
      (await db.query("select * from public.push_reminder_attempts")).rows
        .length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.push_reminder_deliveries")).rows
        .length,
      2,
    );
  } finally {
    await db.close();
  }
});
