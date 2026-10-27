import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("deletion OTP cannot be forged, bypassed, replayed, or brute-forced", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  const sa = "33333333-3333-4333-8333-333333333333",
    sb = "44444444-4444-4444-8444-444444444444",
    sa2 = "55555555-5555-4555-8555-555555555555";
  type Result = { ok: boolean; reason?: string; email?: string };
  async function actor(session = sa) {
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${a}',false); select set_config('request.jwt.claims','{"session_id":"${session}"}',false);`,
    );
  }
  async function attempt(
    code = "123456",
    confirmation: string | null = "DELETE",
  ) {
    return (
      await db.query<{ result: Result }>(
        "select public.delete_own_account($1,$2) as result",
        [confirmation, code],
      )
    ).rows[0].result;
  }
  async function begin(code = "123456") {
    const id = randomUUID();
    const hash = createHash("sha256").update(`${id}:${code}`).digest("hex");
    await db.exec("reset role; set role service_role");
    return (
      await db.query<{ result: Result }>(
        "select public.begin_account_deletion_challenge($1,$2,$3,$4) as result",
        [a, sa, hash, id],
      )
    ).rows[0].result;
  }
  async function activate() {
    await db.exec(
      `reset role; set role service_role; update public.account_deletion_challenges set sent=true where user_id='${a}';`,
    );
  }
  async function allowResend() {
    await db.exec(
      "reset role; update public.account_deletion_challenges set requested_at=now()-interval '61 seconds'",
    );
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid(),auth.jwt() to anon,authenticated;`);
    for (const name of [
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
      "20261027000300_account_deletion_otp.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(
      `insert into auth.users values ('${a}','a@example.com',now()),('${b}','b@example.com',now()); insert into auth.sessions values ('${sa}','${a}',now()-interval '1 day'),('${sb}','${b}',now()),('${sa2}','${a}',now());`,
    );
    const { rows: tasks } = await db.query<{ id: string }>(
      "insert into public.tasks(user_id,title) values ($1,'A task'),($2,'B task') returning id",
      [a, b],
    );
    await db.query(
      "insert into public.push_reminder_deliveries(reminder_key) values ($1),($2)",
      tasks.map((task) => `task:${task.id}:date`),
    );
    await db.query(
      "insert into public.feedback(user_id,kind,message,app_version) values ($1,'feedback','A feedback message','2.0.0'),($2,'feedback','B feedback message','2.0.0')",
      [a, b],
    );
    await actor();
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE')"),
      /does not exist/,
    );
    assert.equal((await attempt()).reason, "request_code");
    await assert.rejects(
      db.query("select * from public.account_deletion_challenges"),
    );
    await assert.rejects(
      db.query("update public.account_deletion_challenges set sent=true"),
    );
    await assert.rejects(
      db.query("select public.begin_account_deletion_challenge($1,$2,$3,$4)", [
        a,
        sa,
        "0".repeat(64),
        randomUUID(),
      ]),
    );
    const first = await begin();
    assert.deepEqual(first, { ok: true, email: "a@example.com" });
    assert.equal((await begin()).reason, "cooldown");
    await actor();
    assert.equal(
      (await attempt()).reason,
      "request_code",
      "unsent code cannot authorize deletion",
    );
    await activate();
    await actor(sa2);
    assert.equal(
      (await attempt()).reason,
      "request_code",
      "code belongs to the requesting browser session",
    );
    await actor(sb);
    assert.equal((await attempt()).reason, "session");
    await actor();
    assert.equal((await attempt("123456", null)).reason, "confirmation");
    for (let i = 0; i < 5; i++)
      assert.equal((await attempt("654321")).reason, "invalid_code");
    assert.equal(
      (await attempt()).reason,
      "attempts",
      "correct code also blocked after five failed attempts",
    );
    await allowResend();
    assert.equal((await begin("222222")).ok, true);
    await activate();
    await actor();
    assert.equal(
      (await attempt("123456")).reason,
      "invalid_code",
      "resending invalidates the previous code",
    );
    await db.exec(
      "reset role; update public.account_deletion_challenges set expires_at=now()-interval '1 second'",
    );
    await actor();
    assert.equal((await attempt()).reason, "expired");
    await allowResend();
    await begin();
    await activate();
    await db.exec(
      `reset role; update auth.users set email='changed@example.com' where id='${a}'`,
    );
    await actor();
    assert.equal(
      (await attempt()).reason,
      "request_code",
      "email change invalidates a code",
    );
    await db.exec(
      `reset role; update auth.users set email='a@example.com' where id='${a}'`,
    );
    for (let i = 0; i < 2; i++) {
      await allowResend();
      assert.equal((await begin()).ok, true);
    }
    await allowResend();
    assert.equal((await begin()).reason, "rate_limit");
    await activate();
    // Logging out cannot erase the account-wide resend limits.
    await db.exec(`reset role; delete from auth.sessions where id='${sa}';`);
    assert.equal(
      (await db.query("select * from public.account_deletion_challenges")).rows
        .length,
      1,
    );
    await actor();
    assert.equal((await attempt()).reason, "session");
    await db.exec(
      `reset role; insert into auth.sessions values ('${sa}','${a}',now());`,
    );
    await actor();
    assert.deepEqual(await attempt(), { ok: true });
    assert.equal((await attempt()).reason, "session");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.account_deletion_challenges")).rows
        .length,
      0,
    );
    assert.deepEqual(
      (await db.query("select user_id from public.tasks")).rows,
      [{ user_id: b }],
    );
    assert.deepEqual(
      (await db.query("select user_id from public.feedback")).rows,
      [{ user_id: b }],
    );
    assert.equal(
      (await db.query("select * from public.push_reminder_deliveries")).rows
        .length,
      1,
    );
    assert.deepEqual((await db.query("select id from auth.users")).rows, [
      { id: b },
    ]);
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select public.delete_own_account('DELETE','123456')"),
    );
  } finally {
    await db.close();
  }
});
