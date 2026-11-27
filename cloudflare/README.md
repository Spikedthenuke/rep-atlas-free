# Cloudflare push reminder setup

This guide connects workout reminders to Rep Atlas on GitHub Pages. Cloudflare runs the sender and timer, so no computer needs to stay on. The setup uses Cloudflare Workers Free and one D1 database; do not upgrade to a paid plan for this personal setup.

The Worker stores one active push subscription, the selected plan's weekly days, reminder time, time zone, and the date it last sent a reminder. It does not receive workout logs, goals, or exercise history. The app stores its Worker URL and app token separately from workout backups. You can turn reminders off in the app to remove the Cloudflare subscription. This version supports one active iPhone subscription; enabling it on another phone replaces the first.

## Before you start

- A free Cloudflare account.
- Rep Atlas published at https://spikedthenuke.github.io/rep-atlas-free/.
- An iPhone on iOS 16.4 or later. Add Rep Atlas to the Home Screen and use the Home Screen app to enable notifications.

## 1. Create a D1 database

1. In the Cloudflare dashboard, open Workers & Pages, then D1 SQL Database, and create a database named rep-atlas-reminders.
2. Open the database Console and run the SQL from schema.sql in this folder.

## 2. Create the Worker

1. Open Workers & Pages and create a Worker named rep-atlas-reminders. Deploy the starter Worker.
2. Open the Worker, select Edit code or Quick edit, replace the starter code with all of worker.js in this folder, and deploy.
3. In the Worker's Settings and Bindings, add a D1 database binding. Set the variable name to exactly DB and select rep-atlas-reminders.
4. Make sure the Worker has its workers.dev URL enabled. Cloudflare shows an address like https://rep-atlas-reminders.your-account.workers.dev; use your actual address.

## 3. Generate and store the keys

1. Open https://spikedthenuke.github.io/rep-atlas-free/cloudflare/keygen.html in a browser and select Generate setup keys.
2. In the Worker's Settings, open Variables and Secrets. Add VAPID_PUBLIC_KEY as a regular text variable.
3. Add VAPID_PRIVATE_JWK as a secret and paste the private JWK from the generator.
4. Add APP_API_TOKEN as a secret and paste the app token from the generator.
5. Keep the private JWK and app token private. Never add them to GitHub, a public issue, or a screenshot. The key generator creates them in your browser and does not upload them.

## 4. Add the minute schedule

Open the Worker's Settings, then Triggers and Cron Triggers. Add the expression * * * * * and save. Cron starts each check using UTC; the Worker compares against your phone's saved time zone. If a scheduled check is delayed, the reminder can arrive up to four minutes after the selected time. Cloudflare may take several minutes to activate a new trigger.

The minute check uses 1,440 of the Workers Free plan's 100,000 daily requests. It reads one small D1 record per minute and writes only after sending a reminder. Current D1 Free quotas are 5 million rows read and 100,000 rows written per day. See Cloudflare's Workers limits and D1 pricing for current quotas. If a Free quota is exceeded, reminder requests or database queries can stop until usage resets.

## 5. Connect Rep Atlas on iPhone

1. Open Rep Atlas in Safari, tap Share, then Add to Home Screen, and launch the Home Screen app.
2. Create and save a workout plan if you have not already.
3. In Rep Atlas, open Settings and backup, then Push reminders.
4. Enter the exact workers.dev URL, the APP_API_TOKEN, choose a plan and reminder time, then tap Save Cloudflare settings.
5. Tap Enable or update reminders and allow notifications when iOS asks.

The Worker sends one reminder per scheduled day for the selected plan, using your phone's local time zone. If you change the plan's weekly days, update reminders in Settings so Cloudflare receives the new schedule. Disable reminders in Settings to remove the stored subscription and stop future sends.

## Troubleshooting

- Worker connection failed: confirm the URL is the root HTTPS workers.dev address, VAPID_PUBLIC_KEY is set, and the Worker is deployed.
- Database binding is missing: make sure the D1 binding variable is named exactly DB.
- App token was not accepted: check that the token saved in Rep Atlas matches the APP_API_TOKEN secret.
- Notifications are not allowed: open iPhone Settings, then Notifications, then Rep Atlas, and allow notifications. Push is available only in the Home Screen app on supported iOS versions.
- No reminder arrived: confirm the Cron Trigger is active, the selected plan still has scheduled weekdays, and iOS notifications are allowed. Delivery timing also depends on iOS and the push service.
