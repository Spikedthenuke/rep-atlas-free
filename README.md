# Rep Atlas

A free workout planner for your iPhone Home Screen. The site runs from GitHub Pages, and workout plans, goals, and logs stay in local storage on your phone.

## Publish with GitHub Pages

The site files are in the repository root. In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select the **main** branch and **/(root)** folder, and save. After publishing, open the Pages URL in iPhone Safari, tap **Share → Add to Home Screen**, enable **Open as Web App**, and tap **Add**.

GitHub Free Pages hosting requires a public repository. The source and website are public. The app includes backup and restore for data stored on the phone.

## Features

- Build full body, upper/lower, push/pull/legs, cardio, and mixed strength/cardio plans.
- Mark workout availability on the calendar; plans use selected days and repeat weekly.
- Recover after a missed workout by rescheduling the remaining split appropriately.
- Set goals, explore plan variations, track workout history, and edit or create exercises.
- Search a library of 199 exercises.
- View front and back muscle maps with selected groups highlighted in red.
- Switch light and dark appearance with a slider.
- Use the site offline after it has been opened once and cached.

## Optional push reminders

GitHub Pages serves static files and cannot send push notifications by itself. Rep Atlas can use a free Cloudflare Worker and D1 database to send one reminder on a scheduled workout day. It runs without an always-on computer.

Follow the [Cloudflare setup guide](cloudflare/README.md). You will create the Worker and database in your Cloudflare account, then paste the Worker URL and a private app token into Rep Atlas Settings. The subscription endpoint, selected reminder weekdays, time, and timezone are stored in Cloudflare. Your workout plans, goals, and logs remain on your phone.

Web push requires iOS 16.4 or later, installing the site on the Home Screen, and allowing notifications. Reminders are optional and will not work until the Cloudflare setup is complete.
