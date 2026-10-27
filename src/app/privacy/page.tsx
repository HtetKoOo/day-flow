import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DayFlowLogo } from "@/components/brand/dayflow-logo";

export const metadata: Metadata = {
  title: "Privacy policy — DayFlow",
  description:
    "How DayFlow handles account, planning, sharing, feedback, and reminder data.",
};

const sections = [
  {
    title: "Who runs DayFlow",
    paragraphs: [
      "DayFlow is a personal planner developed by Htet Ko Oo. For privacy questions, access or correction requests, or account deletion requests, contact htetkooo2532@gmail.com. Please do not send passwords or private timetable contents in your request.",
    ],
  },
  {
    title: "Account and planning data",
    paragraphs: [
      "DayFlow uses Supabase to handle authentication and store your account identifier, email, display name, timezone, tasks, routine rules, one-day changes, notes, and timetable settings. This data lets you sign in, save your plans, and synchronize changes across devices. Passwords are handled by Supabase Auth; DayFlow does not attach them to support reports.",
      "If you choose Google sign-in, Google and Supabase handle that sign-in and provide the account information needed to identify you. You can use the public demo without creating an account; demo changes are temporary.",
    ],
  },
  {
    title: "Private items and timetable sharing",
    paragraphs: [
      "Your personal planner requires sign-in. Database access rules separate accounts. Marking an item private controls sharing and calendar export; it does not encrypt the item or hide it from administrators who operate the service.",
      "A view-only share link can be opened by anyone who has the link. Shared timetables show the selected dates, display name, and non-private items. Private tasks and routines and item notes are excluded. Shared data can change as you edit the timetable. You can revoke links in Settings → Sharing, but revocation cannot erase screenshots or information someone has already copied.",
    ],
  },
  {
    title: "Calendar imports and exports",
    paragraphs: [
      "Imported calendar entries become data in your account and are private by default. Import only information you intend to store in DayFlow. Exports download a calendar file to your device. Depending on your export choices, private entries can be excluded, represented as Busy, or included with details. Check the export options before giving a file to someone else. DayFlow cannot revoke a downloaded file.",
    ],
  },
  {
    title: "Reminders and push notifications",
    paragraphs: [
      "Notifications are optional. Enabling push stores a device/browser subscription endpoint and encryption keys so the reminder service can reach that device through its push provider. Reminder processing uses your scheduled items, reminder choices, and timezone. Delivery records help prevent duplicates and retry failed deliveries.",
      "Notification content can include a task or routine title and may appear on a lock screen, including for items marked private. Device notification settings control how previews appear. Disable push in Settings → Planning or revoke notification permission in your browser or device settings. Delivery depends on the browser, device, network, and operating system.",
    ],
  },
  {
    title: "Feedback and support email",
    paragraphs: [
      "When you submit feedback, DayFlow saves the type, message, optional reply email, account identifier, app version, and submission time in Supabase. Feedback is not readable by other app users. Task titles, notes, and browser diagnostics are not automatically attached.",
      "The message, optional reply email, version, and feedback reference are sent through Resend to the developer’s support inbox, hosted by Gmail. The optional email is used as Reply-To so the developer can respond; it does not trigger an automatic reply. If email delivery fails, the saved feedback remains available to the developer. Leave out passwords and sensitive information.",
    ],
  },
  {
    title: "Cookies, device storage, and service providers",
    paragraphs: [
      "DayFlow uses authentication cookies and browser storage for functions such as sign-in, appearance, sidebar preferences, reminder deduplication, cross-tab updates, and dismissal of the evening planning reminder. The installed app’s service worker caches public icons and an offline fallback page; it does not provide offline access to your private planner.",
      "Vercel hosts the website, Supabase provides authentication, database, and reminder processing, and Resend sends support and authentication email. Google is involved when you choose Google sign-in or when support email is received in Gmail. Your browser’s push provider handles push delivery. These providers may process technical request data, such as IP addresses and service logs, and may process data in countries different from yours. Their own privacy terms also apply. DayFlow does not include advertising trackers in its application code.",
    ],
  },
  {
    title: "Retention and your choices",
    paragraphs: [
      "Planning data is kept until you delete the relevant items or request account deletion. Feedback, email copies, and operational records do not currently have a fixed automatic deletion schedule. Provider backups and logs may remain according to the provider’s retention practices; deleting an item does not guarantee immediate removal from backups or copies already shared.",
      "You can edit or delete planning items, export a timetable, revoke share links, and disable notifications. To permanently delete your account and its stored planning data, open Settings → Security → Delete account. This requires a code sent to your verified account email and typing DELETE to confirm. A short-lived, hashed deletion code and attempt counters are stored to enforce verification and request limits. The code is linked to the browser session that requested it and is sent through Resend; it is not used to sign you in or reset your password. It also removes stored feedback and revokes your share links and push subscriptions. Support email copies and provider backups are not removed by this action. A reminder already in transit may still arrive. Email the contact below to request a copy of account data, correction or deletion of support emails, or help if you cannot sign in. We may need to confirm account ownership before acting. This policy does not promise a particular response deadline or complete deletion from third-party copies.",
    ],
  },
  {
    title: "Policy updates and contact",
    paragraphs: [
      "This page describes the current DayFlow v2 implementation. We will update the date on this page when our data practices change. For questions or requests, email htetkooo2532@gmail.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/settings?section=app"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Back to DayFlow
      </Link>
      <div className="mt-6">
        <DayFlowLogo />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated October 27, 2026 · DayFlow v2
      </p>
      <p className="mt-6 leading-7 text-muted-foreground">
        Your timetable is personal. This page explains what DayFlow stores, when
        information is shared, and the choices available to you.
      </p>
      <nav
        aria-label="Privacy policy contents"
        className="mt-8 rounded-2xl border bg-card p-5"
      >
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {sections.map(({ title }, index) => (
            <li key={title}>
              <a
                href={`#privacy-${index + 1}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-10 space-y-9">
        {sections.map(({ title, paragraphs }, index) => (
          <section
            key={title}
            id={`privacy-${index + 1}`}
            className="scroll-mt-6"
          >
            <h2 className="text-xl font-semibold">{title}</h2>
            {paragraphs.map((text) => (
              <p key={text} className="mt-3 leading-7 text-muted-foreground">
                {text}
              </p>
            ))}
          </section>
        ))}
      </div>
      <a
        href="mailto:htetkooo2532@gmail.com"
        className="mt-8 inline-flex min-h-11 break-all items-center text-primary underline underline-offset-4"
      >
        htetkooo2532@gmail.com
      </a>
    </main>
  );
}
