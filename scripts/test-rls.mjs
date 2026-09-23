import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
// Real PostgreSQL engine in WASM. Only Supabase's auth schema/roles are mocked.
const db = new PGlite();
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
let checks = 0;
async function ok(sql, count = 1) {
  const r = await db.query(sql);
  assert.equal(r.rows.length, count);
  checks++;
  return r.rows;
}
async function denied(sql) {
  await assert.rejects(() => db.exec(sql));
  checks++;
}
async function as(id) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260923000100_dayflow_foundation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(`insert into auth.users values ('${A}'),('${B}');`);
  await as(B);
  const [cat] = await ok(
    "insert into public.categories(name) values ('B category') returning id",
  );
  const [rec] = await ok(
    "insert into public.recurring_tasks(title,start_time,frequency,starts_on) values ('B recurring','09:00','daily','2026-09-24') returning id",
  );
  await ok("insert into public.tasks(title) values ('B task') returning id");
  await as(A);
  await ok("select * from public.profiles");
  await ok(
    `update public.profiles set display_name='A' where id='${A}' returning id`,
  );
  await ok(
    `update public.profiles set display_name='intrusion' where id='${B}' returning id`,
    0,
  );
  await denied(`update public.profiles set id='${B}' where id='${A}'`);
  await denied("update public.profiles set timezone='Invalid/Zone'");
  await denied(`insert into public.profiles(id) values ('${A}')`);
  await denied(`delete from public.profiles where id='${A}'`);
  for (const [table, fields, values] of [
    ["categories", "name", "'A category'"],
    ["tasks", "title", "'A task'"],
    [
      "recurring_tasks",
      "title,start_time,frequency,starts_on",
      "'A recurring','09:00','daily','2026-09-24'",
    ],
  ]) {
    await ok(`select * from public.${table}`, 0);
    const [own] = await ok(
      `insert into public.${table}(${fields}) values (${values}) returning id`,
    );
    await denied(
      `insert into public.${table}(user_id,${fields}) values ('${B}',${values})`,
    );
    await ok(
      `update public.${table} set ${table === "categories" ? "name='updated'" : "title='updated'"} where id='${own.id}' returning id`,
    );
    await denied(
      `update public.${table} set user_id='${B}' where id='${own.id}'`,
    );
    await ok(
      `update public.${table} set user_id='${A}' where user_id='${B}' returning id`,
      0,
    );
    await ok(
      `delete from public.${table} where user_id='${B}' returning id`,
      0,
    );
    await ok(`delete from public.${table} where id='${own.id}' returning id`);
  }
  await denied(
    `insert into public.tasks(title,category_id) values ('cross user','${cat.id}')`,
  );
  await denied(
    `insert into public.tasks(title,recurring_task_id,occurrence_date) values ('cross user','${rec.id}','2026-09-24')`,
  );
  await denied(
    `insert into public.recurring_tasks(title,start_time,frequency,starts_on,category_id) values ('cross user','09:00','daily','2026-09-24','${cat.id}')`,
  );
  await denied(
    "insert into public.tasks(title,start_time) values ('partial','09:00')",
  );
  await denied(
    "insert into public.tasks(title,scheduled_date,start_time,duration_minutes) values ('overflow','2026-09-24','23:50',30)",
  );
  await denied(
    "insert into public.tasks(title,is_completed) values ('bad completed',true)",
  );
  await denied(
    "insert into public.recurring_tasks(title,start_time,frequency,starts_on) values ('empty week','09:00','weekly','2026-09-24')",
  );
  const [template] = await ok(
    "insert into public.recurring_tasks(title,start_time,frequency,starts_on) values ('Repeat','09:00','daily','2026-09-24') returning id",
  );
  await ok(
    `insert into public.tasks(title,recurring_task_id,occurrence_date) values ('First','${template.id}','2026-09-24') returning id`,
  );
  await denied(
    `insert into public.tasks(title,recurring_task_id,occurrence_date) values ('Duplicate','${template.id}','2026-09-24')`,
  );
  await denied(`delete from public.recurring_tasks where id='${template.id}'`);
  const [ownCat] = await ok(
    "insert into public.categories(name) values ('Disposable') returning id",
  );
  await ok(
    `insert into public.tasks(title,category_id) values ('Keep me','${ownCat.id}') returning id`,
  );
  await db.exec(`delete from public.categories where id='${ownCat.id}'`);
  await ok(
    "select * from public.tasks where title='Keep me' and category_id is null",
  );
  await db.exec("reset role; set role anon;");
  for (const table of ["profiles", "categories", "tasks", "recurring_tasks"]) {
    await denied(`select * from public.${table}`);
    await denied(`delete from public.${table}`);
    await denied(
      `update public.${table} set ${table === "profiles" ? "display_name='x'" : table === "categories" ? "name='x'" : "title='x'"}`,
    );
    await denied(`insert into public.${table} default values`);
  }
  await db.exec(`reset role; delete from auth.users where id='${A}';`);
  await ok(`select * from public.tasks where user_id='${A}'`, 0);
  console.log(
    `PASS: ${checks} database assertions (CRUD isolation, ownership, constraints, recurrence, anonymous denial, deletion).`,
  );
} finally {
  await db.close();
}
