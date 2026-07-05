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

## Custom domain (am369network.in)

A `CNAME` file in the repo root already points GitHub Pages at `am369network.in`. At your domain registrar (Hostinger), add these DNS records:

- **A records** for the root domain, all four:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- **CNAME** for `www` → `lostinfrequencies369.github.io`

Then in repo Settings → Pages, confirm the custom domain shows `am369network.in` and enable **Enforce HTTPS** once DNS has propagated (can take up to 24 hours).

## Google Drive image upload (direct from admin)

Every thumbnail field in the admin panel has an **Upload to Drive** button next to the URL box. It uploads straight into an auto-sorted Drive folder tree (`AM369 Network Media/Apps`, `/Blogs`, `/Directories`, `/Species/<name>`), then fills in a public view URL for you.

**One-time setup:**
1. Go to [script.google.com](https://script.google.com) → New project.
2. Paste in the contents of `backend/DriveUploader.gs` from this repo.
3. Run the `setup` function once (authorize Drive access when prompted).
4. **Deploy → New deployment → Web app** — Execute as *Me*, Who has access *Anyone with the link*.
5. Copy the deployment URL.
6. In the admin panel: **Settings → Google Drive Upload** → paste the URL, confirm the shared key matches `ADMIN_KEY` in the script (default `AnkiMunky321`) → Save.

No SQL, no paid backend — Drive itself is the file store, and folders are created automatically on first use per section/species.

### Websites / Data / Music / Photos folder + Sheet

The same script can also set up a separate structure for general site data:

```
Websites/
  Data/
  Music/
  Photos/
  AM369 Website Data   (Google Sheet — tabs: Data, Music, Photos)
```

Run it once, either:
- In the Apps Script editor: select `setupWebsiteFolders` from the function dropdown → Run, or
- After deploying, visit `<your-deployment-url>?action=setup&key=YOUR_ADMIN_KEY` in a browser.

It's safe to run more than once — it reuses the folders and sheet instead of duplicating them. The Sheet's three tabs give you a ready place to log music/photo file links and any other site data outside the JSON collections.

## Multi-level caching

- **L1 — memory**: every JSON collection and every resolved image sits in an in-memory cache for the current tab (instant, no I/O).
- **L2 — LocalStorage** (data) / **IndexedDB** (images): survives reloads and works offline. Data edits live here until exported; images are cached as actual blobs so repeat views load instantly even on a slow connection.
- **L3 — network**: only hit on first load of a given JSON file or image; after that it's served from L1/L2.

This is what makes the site feel instant on repeat visits and keeps Drive-hosted images fast even though Drive itself can be slow to serve on first request.

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
