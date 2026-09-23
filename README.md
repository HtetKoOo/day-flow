# DayFlow — Plan tomorrow tonight

Tomorrow-first personal planner · Next.js + Supabase · Web App + PWA

ဤ repository သည် **V1 foundation** ဖြစ်ပါတယ်။ Full planner မပြီးသေးပါ။ Today/Tomorrow/Week shell, Auth wiring, database/RLS, PWA နှင့် development setup ပါပြီး task CRUD/drag/resize/recurrence generation ကို နောက်အဆင့်မှာ ဆက်လုပ်ရန် [V1 blueprint](docs/V1-BLUEPRINT.md) မှာ မှတ်သားထားပါတယ်။

## 1. Local development

Node.js 24 LTS နှင့် npm သုံးပါ။

```sh
npm ci
cp .env.example .env.local
npm run dev
```

http://localhost:3000 မှာဖွင့်ပါ။ Supabase values မဖြည့်ရသေးလျှင် setup page ပြပါမယ်။ `.env.local` ပြင်ပြီးတိုင်း dev server restart လုပ်ပါ။

```text
src/app/               Routes, Auth actions, manifest
src/components/ui/     shadcn/ui registry components (locally owned)
src/components/planner/ Responsive foundation shell
src/lib/supabase/       Browser/server clients
src/lib/validation/     Zod input validation
supabase/migrations/   Versioned schema, constraints, RLS
scripts/test-rls.mjs    PostgreSQL isolation tests
public/                PWA worker, icons, offline page
```

## 2. Supabase Free project

1. Supabase dashboard မှာ Free project တစ်ခုဖန်တီးပါ။ Database password ကို password manager ထဲသိမ်းပါ။
2. SQL Editor မှာ `supabase/migrations/20260923000100_dayflow_foundation.sql` ကိုတစ်ကြိမ် run ပါ။ သို့မဟုတ် CLI migration flow ကိုသုံးပါ။ နှစ်မျိုးလုံးထပ်မလုပ်ပါနဲ့။
3. Connect dialog မှ **Project URL** နှင့် **publishable key** ကို `.env.local` ရဲ့ `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ထဲထည့်ပါ။
4. Auth → URL Configuration မှ Site URL ကို local အတွက် `http://localhost:3000` ထားပါ။ Deployment ပြီးလျှင် production HTTPS URL သို့ပြောင်းပါ။
5. Email signup/password login ဖွင့်ထားပြီး email confirmation ကို enable လုပ်ပါ။ Confirm signup email template link ကို အောက်ပါအတိုင်းထားပါ။

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirm your email</a
>
```

Email confirmation link က session တည်ဆောက်ပြီး `/planner` သို့ပို့ပါမယ်။ Supabase default email delivery က test-only limitations ရှိနိုင်လို့ မိမိ account ဖြင့်စမ်းပြီး wider signup မဖွင့်မီ SMTP requirements ကိုစစ်ပါ။ Custom SMTP provider free tier သည် provider limits ပေါ်မူတည်ပါတယ်။

CLI workflow (project reference သည် secret မဟုတ်ပါ):

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

CLI login/access tokens နှင့် database password များကို source code, chat, commit ထဲမထည့်ပါနဲ့။ App မှ service-role key မလိုပါ။ Browser publishable key သည် public ဖြစ်နိုင်ပြီး data ကို **RLS** ကကာကွယ်ပါတယ်။ `.env*` ဖိုင်များကို Git ignore ထားပြီး `.env.example` ပဲ commit လုပ်ပါတယ်။

## 3. Local database (optional, Docker required)

```sh
npm run db:start
npm run db:reset
npm run db:types
npm run db:stop
```

`db:reset` က local data ကိုဖျက်ပြီး migrations ပြန်တင်ပါတယ်။ Production မှာမသုံးပါနဲ့။ Local CLI output ထဲက URL/publishable key ကို `.env.local` ထဲသုံးနိုင်ပါတယ်။ Auth email ကို local Inbucket UI မှစမ်းနိုင်ပါတယ်။ Local stack စပြီး `db:types` run လျှင် database types ထွက်လာပါမယ်; data layer implementation မှာ client generic နဲ့ဆက်ချိတ်ရန်ကျန်ပါတယ်။

## 4. Checks

```sh
npm run check
npm run build
npm start
```

Database tests သည် PGlite (real PostgreSQL engine) ပေါ်တွင် migration ကို run ပြီး mocked Supabase Auth schema/roles ဖြင့် user A/B CRUD isolation, anonymous denial, cross-owner relations, constraints နှင့် recurrence duplicate prevention စစ်ပါတယ်။ Hosted Supabase/Auth integration test အစားမထိုးပါ။ Hosted setup ပြီးလျှင် account နှစ်ခုဖြင့် login/confirmation/signout နှင့် policy checks ကိုထပ်စမ်းပါ။

## 5. PWA foundation

Production build ကို HTTPS သို့မဟုတ် localhost မှဖွင့်ပြီး browser ရဲ့ Install / Add to Home Screen ကိုသုံးပါ။ Manifest, 192/512 PNG icons, maskable icon, Apple icon နှင့် service worker ပါပါတယ်။ Worker သည် **public offline fallback သာ** cache လုပ်ပါတယ်။ Private tasks, Auth responses, session များကို cache မလုပ်ပါ။ Offline မှာ editing မရသေးပါ။ Worker ကို development mode မှာ register မလုပ်ပါ။

## 6. Vercel deployment

1. Repository ကို မိမိ Git host သို့ push လုပ်ပါ (remote မချိတ်ထားသေးပါ)။
2. Vercel မှ Import Project → Next.js preset, Node 24.x, root repository directory သုံးပါ။
3. အထက်ပါ public env variables နှစ်ခုကို Vercel project environment မှာထည့်ပါ။
4. Deploy ပြီး Supabase Site URL ကို production URL သို့ပြောင်းပါ။ Local test အတွက် local Supabase သုံးခြင်းက production confirmation URL ရောထွေးမှုကိုရှောင်နိုင်ပါတယ်။
5. Signup/confirmation/login/logout, user isolation, install/offline behavior ကိုစမ်းပါ။ Preview deployments အတွက် production user data မသုံးဘဲ သီးခြား test environment သုံးပါ။

$0-friendly သည် free-tier limits အတွင်း personal use အတွက် ရည်ရွယ်ပါတယ်။ Vercel Hobby သည် personal/non-commercial အသုံးပြုမှုအတွက်ဖြစ်ပြီး Supabase Free တွင် quota/pausing ကန့်သတ်ချက်များရှိပါတယ်။ Custom domain မလိုပါ၊ paid AI API/cron မသုံးထားပါ။ Forever-free သို့မဟုတ် production SLA ကိုအာမမခံပါ။

## Official references

- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
