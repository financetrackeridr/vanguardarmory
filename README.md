# My Destiny 2 Favorites

A tiny static site listing favorite weapons and loadouts, built on top of
Bungie's public Destiny 2 manifest. No accounts, no OAuth — just reference
data (item/weapon definitions) plus your own curation.

## How it's structured

- `build/fetchManifest.mjs` — Node script. Downloads the manifest from
  Bungie, pulls out weapon definitions, writes `public/data/weapons.json`.
- `public/data/favorites.json` — **hand-edited by you.** References weapons
  by their `hash` and groups them into loadouts. This is the actual content
  of the site.
- `public/index.html`, `public/style.css`, `public/app.js` — plain
  HTML/CSS/JS frontend. No build tooling, no frameworks. Fetches the two
  JSON files above and renders them.
- `.github/workflows/update-and-deploy.yml` — runs the build script on a
  schedule (weekly, after reset) and on every push to `main`, then deploys
  `public/` to GitHub Pages.

## One-time setup

1. You've already registered an app at bungie.net/en/Application — grab
   the **API Key** (not the OAuth client id/secret, you don't need those).
2. In your GitHub repo: **Settings → Secrets and variables → Actions →
   New repository secret**. Name it `BUNGIE_API_KEY`, paste the key.
3. **Settings → Pages → Build and deployment → Source**: set to
   "GitHub Actions".
4. Push this repo to `main`. The workflow will run, generate
   `public/data/weapons.json`, and deploy.

## Running the build locally (optional, for testing)

```bash
BUNGIE_API_KEY=your-key-here node build/fetchManifest.mjs
```

This writes/updates `public/data/weapons.json`. Open `public/index.html`
via a local static server (not `file://`, since `fetch` needs http) to
preview, e.g.:

```bash
npx serve public
```

## Adding your favorites

Open `public/data/weapons.json` after running the build, find a weapon by
name, copy its `hash`, and add it to `public/data/favorites.json`:

```json
{
  "favoriteWeapons": [
    { "hash": 1234567890, "note": "Why you like it" }
  ],
  "loadouts": [
    {
      "name": "PvE Add Clear",
      "description": "General purpose add-clear loadout",
      "weaponHashes": [1234567890, 2345678901, 3456789012]
    }
  ]
}
```

Commit that file and the site updates on next deploy.

## Notes / known limitations

- The manifest is per-language; the build script defaults to `en`. Change
  `LOCALE` in `fetchManifest.mjs` if you want another language.
- Only weapon-type items are extracted right now. If you later want armor,
  mods, or ornaments, the same script pattern applies — just change the
  `itemType` filter and add whatever display fields you need.
- Bungie updates the manifest each season and each patch (hashes for new
  items appear, and very rarely old ones get "reissued" under a new hash).
  The weekly scheduled workflow keeps `weapons.json` current; your
  `favorites.json` hashes should stay stable across normal patches.
