import Link from "next/link";
export default function Setup() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="eyebrow">DAYFLOW / FOUNDATION</p>
      <h1 className="mt-5 text-5xl font-semibold tracking-tight">
        Plan tomorrow
        <br />
        tonight.
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        A little room for everything that matters.
      </p>
      <section className="mt-12 rounded-3xl border bg-card p-8">
        <h2 className="text-xl font-semibold">Connect your planner</h2>
        <ol className="mt-5 list-decimal space-y-4 pl-5 text-muted-foreground">
          <li>Create a free Supabase project.</li>
          <li>
            Apply the migration in <code>supabase/migrations</code>.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and enter
            the project URL and publishable key.
          </li>
          <li>Restart the development server.</li>
        </ol>
        <p className="mt-6 text-sm">
          See the project README for detailed setup instructions.
        </p>
      </section>
      <Link className="mt-6 inline-block underline" href="/">
        Check connection setup →
      </Link>
      <p className="mt-8 text-sm text-muted-foreground">
        Today · Tomorrow · Week · Inbox
      </p>
    </main>
  );
}
