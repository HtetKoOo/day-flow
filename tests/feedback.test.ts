import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { feedbackSchema } from "../src/lib/feedback/validation";

test("feedback validates limits, types, and optional reply email", () => {
  const input = {
    kind: "bug",
    message: "Something went wrong",
    replyEmail: "",
  };
  assert.equal(feedbackSchema.safeParse(input).success, true);
  for (const change of [
    { kind: "other" },
    { message: "   short " },
    { message: "a".repeat(4001) },
    { replyEmail: "bad\r\nBcc: x" },
  ]) {
    assert.equal(
      feedbackSchema.safeParse({ ...input, ...change }).success,
      false,
    );
  }
  assert.equal(
    feedbackSchema.safeParse({ ...input, replyEmail: "reply@example.com" })
      .success,
    true,
  );
});

test("feedback RPC enforces authentication, privacy, ownership, and rate limits", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      insert into auth.users values ('${a}'),('${b}');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261027000100_feedback.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const submit =
      "select public.submit_feedback('bug','Example issue details','','2.0.0') as id";
    await db.exec("set role anon");
    await assert.rejects(db.query(submit));
    await db.exec("reset role; set role authenticated");
    await assert.rejects(db.query(submit));
    await db.exec(`select set_config('request.jwt.claim.sub','${a}',false)`);
    await assert.rejects(
      db.query(
        "select public.submit_feedback('wrong','Example issue details','','2.0.0')",
      ),
    );
    await db.query(submit);
    await assert.rejects(db.query(submit), /FEEDBACK_RATE_LIMIT/);
    await assert.rejects(db.query("select * from public.feedback"));
    await assert.rejects(
      db.query("update public.feedback set message='tampered message'"),
    );
    await assert.rejects(db.query("delete from public.feedback"));
    await assert.rejects(
      db.query(
        `insert into public.feedback(user_id,kind,message,app_version) values ('${b}','bug','Forged feedback','2.0.0')`,
      ),
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
    await db.query(submit);
    await db.exec("reset role");
    const { rows } = await db.query(
      "select user_id,reply_email from public.feedback order by user_id",
    );
    assert.deepEqual(rows, [
      { user_id: a, reply_email: null },
      { user_id: b, reply_email: null },
    ]);
    // Simulate five earlier submissions within this hour to exercise the hourly cap.
    await db.exec(`update public.feedback set created_at=now()-interval '2 minutes' where user_id='${a}';
      insert into public.feedback(user_id,kind,message,app_version,created_at)
      select '${a}','feedback','Earlier feedback','2.0.0',now()-interval '3 minutes' from generate_series(1,4);
      set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
    await assert.rejects(db.query(submit), /FEEDBACK_RATE_LIMIT/);
  } finally {
    await db.close();
  }
});
