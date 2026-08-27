# Cloudflare Pages Migration

## Project settings

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: Vite
- Node.js version: 22.x

## Environment variables

Set these in Cloudflare Pages for Production before switching DNS.

Values that Vercel CLI can pull:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Values that Vercel marked sensitive and must be copied manually from Vercel or the source service:

- `VITE_ADSENSE_CLIENT`
- `VITE_GROW_SITE_ID`
- `VITE_MEDIAVINE_SCRIPT_SRC`
- `VITE_OCR_API_BASE_URL`

Optional:

- `VITE_REVENUE_LOGGING_ENABLED=true` only if internal revenue event logging should be enabled.

Do not store pulled env files in git. `.env.local`, `.env.vercel*`, `.dev.vars`, and `.vercel` are ignored.

## Routing

Cloudflare routing is configured through:

- `public/_redirects`
- `public/_headers`

Vite copies both files into `dist` during `npm run build`.

## Pages Functions

Vercel functions under `api/idle-dev-game/*` are mirrored for Cloudflare Pages under:

- `functions/api/idle-dev-game/config.js`
- `functions/api/idle-dev-game/stats.js`
- `functions/api/idle-dev-game/session.js`
- `functions/api/idle-dev-game/result.js`
- `functions/api/idle-dev-game/rank.js`

These functions use Cloudflare `context.env` first and also support local `process.env` fallback for compatibility.

## Pre-DNS checklist

1. Create a Cloudflare Pages project from the same git repository.
2. Set build command to `npm run build` and output directory to `dist`.
3. Add all Production environment variables.
4. Deploy a preview build.
5. Verify:
   - `/calculator/`
   - `/ranking/`
   - `/lineup-skill-ocr/`
   - `/idle-dev-game/index.html`
   - `/api/idle-dev-game/config`
   - `/api/idle-dev-game/stats`
6. Confirm Kakao AdFit/AdSense scripts load on the preview domain where allowed.
7. Add `www.cpbv-lab.com` as a custom domain.
8. Switch DNS only after preview checks pass.
