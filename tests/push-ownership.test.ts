import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Switching accounts cannot reuse another owner's push endpoint; a fresh endpoint is isolated", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub')::uuid$$;
      grant usage on schema auth, public to authenticated;
      create table public.profiles(id uuid primary key);
      insert into public.profiles values ('${a}'), ('${b}');`);
    for (const name of [
      "20261010000500_add_push_subscriptions.sql",
      "20261011000100_allow_push_subscription_updates.sql",
    ]) {
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    }
    const as = async (id: string) =>
      db.exec(
        `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
      );
    await as(a);
    await db.query(
      "insert into public.push_subscriptions(endpoint,p256dh,auth) values ('old-device','key','auth')",
    );
    await as(b);
    assert.equal(
      (
        await db.query(
          "select id from public.push_subscriptions where endpoint='old-device'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(() =>
      db.query(
        "insert into public.push_subscriptions(endpoint,p256dh,auth) values ('old-device','key','auth') on conflict(endpoint) do update set p256dh=excluded.p256dh",
      ),
    );
    await db.query(
      "insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ($1,'fresh-device','key','auth')",
      [b],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.push_subscriptions where endpoint='fresh-device'",
        )
      ).rows.length,
      1,
    );
    await as(a);
    await db.query(
      "insert into public.push_subscriptions(endpoint,p256dh,auth) values ('other-device','key','auth')",
    );
    await db.query(
      "delete from public.push_subscriptions where endpoint=$1 and user_id=$2",
      ["old-device", a],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.push_subscriptions where endpoint='other-device'",
        )
      ).rows.length,
      1,
      "Other devices on the account remain registered",
    );
    await as(b);
    assert.equal(
      (
        await db.query(
          "select * from public.push_subscriptions where endpoint='fresh-device'",
        )
      ).rows.length,
      1,
      "Other accounts remain registered",
    );
    await as(a);
    assert.equal(
      (
        await db.query(
          "select * from public.push_subscriptions where endpoint='fresh-device'",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.push_subscriptions where endpoint='other-device'",
        )
      ).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
