# Rep Atlas

A free workout planner for your iPhone Home Screen. This static site runs from GitHub Pages. Workout data stays in local storage on the phone. No Apple developer membership or Mac is needed.

## Publish with GitHub Pages

This repository contains the site files in its root folder.

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose the `main` branch and the `/(root)` folder, then save.
4. After GitHub publishes the site, open the URL shown on the Pages settings page in Safari on your iPhone.
5. Tap **Share → Add to Home Screen**, enable **Open as Web App**, then tap **Add**.

GitHub Free Pages hosting requires a public repository. The source and website are public. Plans, exercise changes, workout logs, and goals remain on the phone in local web storage, with a backup and restore option in the app.

## Features

- Plan builder with full body, upper/lower, push/pull/legs, and cardio splits.
- Mark available dates on a calendar; new plans schedule into the selected week and repeat on those weekdays.
- Change between light and dark appearance with a slider in Settings.
- Option to add cardio blocks to strength sessions, with cardio included automatically for endurance goals.
- Goal based workout suggestions and four plan variations.
- Searchable, editable library of 199 exercises.
- Front and back muscle maps with selected groups highlighted red.
- Missed workout recovery plans that skip the missed session, preserve the remaining schedule, and continue your split.
- Workout logs, goals, and backup/restore.
- Offline use after the site is first opened in Safari and cached.

## Push reminders

Push reminders are not connected in this GitHub Pages version. iPhone web push requires iOS 16.4 or later, adding the site to the Home Screen, notification permission, and a server that stores the device subscription and sends reminders. GitHub Pages serves static files and cannot run that sender. A free serverless option can run the sender without an always-on computer, but it would store the push subscription and reminder schedule with that provider. The app does not send workout logs to such a service.
