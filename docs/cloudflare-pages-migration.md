# Cloudflare Workers Migration

## Project settings

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Static assets directory: `dist`
- Worker config: `wrangler.json`
- Framework preset: Vite or none
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

Optional:

- `VITE_REVENUE_LOGGING_ENABLED=true` only if internal revenue event logging should be enabled.

Do not store pulled env files in git. `.env.local`, `.env.vercel*`, `.dev.vars`, and `.vercel` are ignored.

## Routing

Cloudflare routing is configured in two places:

- `wrangler.json` controls which paths run Worker code before static assets.
- `worker/index.js` handles redirects, `/admin`, and `/api/idle-dev-game/*`.
- `public/_redirects` and `public/_headers` remain for Pages compatibility.

Vite copies both files into `dist` during `npm run build`.

## API handlers

Vercel functions under `api/idle-dev-game/*` are mirrored under:

- `functions/api/idle-dev-game/config.js`
- `functions/api/idle-dev-game/stats.js`
- `functions/api/idle-dev-game/session.js`
- `functions/api/idle-dev-game/result.js`
- `functions/api/idle-dev-game/rank.js`

The Worker entrypoint imports these handlers from `worker/index.js`.
The handlers use Cloudflare `context.env` first and also support local `process.env` fallback for compatibility.

## Pre-DNS checklist

1. Create a Cloudflare Worker from the same git repository.
2. Set build command to `npm run build` and deploy command to `npx wrangler deploy`.
3. Add all Production environment variables.
4. Deploy a preview build.
5. Verify:
   - `/calculator/`
   - `/ranking/`
   - `/lineup-skill/`
   - `/idle-dev-game/index.html`
   - `/api/idle-dev-game/config`
   - `/api/idle-dev-game/stats`
6. Confirm Kakao AdFit scripts load on the preview domain where allowed.
7. Add `www.cpbv-lab.com` as a custom domain.
8. Switch DNS only after preview checks pass.
