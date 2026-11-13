# Personal WhatsApp Scheduler

Next.js dashboard, Supabase Auth/Postgres, GREEN-API, and external minute cron. All display and recurrence rules use Asia/Kathmandu. One fixed recipient is configured server-side.

## Setup

1. Use Node 24, run `npm ci`, copy `.env.example` to `.env.local`, and supply values securely. Rotate the previously exposed GREEN-API token and Supabase secret before use.
2. Run `supabase/001_scheduler.sql` in the existing Supabase SQL editor. Tables have RLS with no browser grants; only authenticated server routes use the secret key.
3. Disable public signup in Supabase Auth. Create one confirmed admin account in Auth → Users. Set `ADMIN_USER_ID` to that user's UUID. Password recovery can be managed through Supabase administration. Configure Auth rate limits.
4. Run `npm run dev`. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` to validate.

## Existing Vercel project

Import/push this repository into the existing project serving `https://whatsappbot-six-puce.vercel.app`; do not create another project. Add all `.env.example` variables to the Production environment. Set Node 24 and deploy. Never prefix server credentials with NEXT_PUBLIC. The public Supabase key is intentionally browser-safe; this app still uses it only for server auth.

Update cron-job.org job `whatsapp_bot`:

- Method: POST
- URL: https://whatsappbot-six-puce.vercel.app/api/cron/dispatch
- Header: Authorization: Bearer <CRON_SECRET>
- Schedule: every minute, all hours/days/months; use Asia/Kathmandu for job display
- Body: empty; timeout at least 45 seconds

Use a randomly generated high-entropy CRON_SECRET. No Vercel cron or always-on computer is needed.

## Dispatch guarantees

`claim_due` locks one reminder using FOR UPDATE SKIP LOCKED, inserts a unique occurrence, and advances the schedule in the same transaction. Each request claims at most three occurrences to stay within 60 seconds. Missed recurring runs coalesce into one attempt and advance beyond now. Paused reminders resume with one catch-up occurrence. Overlapping requests cannot claim the same occurrence. Edits affect future claims; an already claimed message may still send.

A claim is committed before sending. A crash or timeout can leave `sending` or `uncertain`: inspect GREEN-API manually before sending a replacement. There are deliberately no automatic retries and no exactly-once delivery claim across the database/provider boundary. `accepted` records provider acceptance, not final delivery. Deleting a reminder preserves history with a null reminder ID. Immediate tests also record their attempts.

## Validation limits

Unit tests mock GREEN-API. Live database concurrency, CRUD/auth, provider delivery and deployment require configured external accounts and the applied SQL migration. Do not use production data for automated tests. An integration concurrency test should insert one due reminder in an isolated Supabase project, call claim_due concurrently and assert exactly one delivery for that occurrence, then clean up.
