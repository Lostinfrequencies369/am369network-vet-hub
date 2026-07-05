# AM 369 Network — Veterinary Web Portal + Admin CMS

**Designed by Dr. Ankit Malik**

A premium responsive veterinary resource portal with a separate admin CMS. Pure HTML/CSS/JS + JSON data — deployable on GitHub Pages with no backend for the basic version.

## Files

```
index.html            Public portal
admin.html            Admin panel (separate path)
assets/css/style.css  Public styles
assets/css/admin.css  Admin styles
assets/js/data-service.js  Data layer (caching + LocalStorage overlay)
assets/js/app.js      Public site logic
assets/js/admin.js    Admin CMS logic
assets/data/*.json    apps / blogs / directories / species / images / settings
```

## How data works (important)

- On first load, the JSON files in `assets/data/` are fetched and cached in memory + LocalStorage.
- The admin panel edits data in **LocalStorage on your browser only**.
- GitHub Pages is static — the browser cannot write back to repo files without a backend.
- To publish changes for **everyone**: in admin go to **Settings → Export JSON backup**, then replace the matching files in `assets/data/` in your repo and commit.

## Using the admin panel

1. Open `admin.html`.
2. Enter the passcode (default `AnkiMunky321` — change it in `assets/js/admin.js`, `DEMO_PASSCODE`).
3. Add/edit/delete Web Apps, Blogs, Directories, Species.
4. Every button shows a processing state and blocks double-clicks.
5. Export a backup, or import one, or reset to sample data.

> **Security:** The admin login is a client-side lock only — fine for local/demo use, not real protection. For production auth + shared saving, use the backend upgrade path below.

## Add a Google Web App link
Admin → Web Apps → **+ Add App** → paste the app URL, description, pick species, set Active + Featured → Save.

## Add a blog
Admin → Blogs → **+ Add Article** → fill fields → Published/Draft → Save.

## Change thumbnails
Paste an image URL (Google Drive share link, Imgur, etc.) in any thumbnail field. Blank = automatic placeholder.

## Ads (future-proof)
Admin → Settings → **Ad Slots**. Turn on the master switch, enable a slot, paste your ad network code. Slots exist on: home top, home inline, blog detail. They stay hidden until enabled.

## Enable GitHub Pages
Repo → **Settings → Pages** → Source: Deploy from a branch → `main` / root → Save.
Live at `https://<username>.github.io/<repo>/`.

## Android WebView
All paths are relative and layout is mobile-first, so it loads cleanly inside a WebView wrapper. Buttons are touch-sized; no desktop-only features are required.

## Future backend upgrade path

**Option A — Google Apps Script + Google Sheet**
- Store each collection as a Sheet tab.
- Publish an Apps Script Web App with `doGet`/`doPost` returning/updating JSON.
- Handle admin auth server-side (secret key or Google login).
- Point `data-service.js` fetches at the Apps Script URL instead of local JSON.

**Option B — GitHub API**
- Use a backend (or serverless function) holding a token to commit updated JSON to the repo via the GitHub Contents API.
- Never put the token in frontend code.

Either option turns the LocalStorage demo into a true multi-user CMS.
