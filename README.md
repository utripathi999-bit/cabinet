# Cabinet

One niche topic a day, generated fresh by Gemini, with real YouTube sources
to start researching from. Built with Next.js, deployed on Vercel.

Every night at 23:55 IST a cron job asks Gemini for a new topic, checks it
against everything picked before — both an exact/reworded-duplicate check
and a semantic similarity check on embeddings, so "Typography" and "The
Printing Press" can both get picked without one blocking the other — looks
up real videos on YouTube for it, and caches the result. When you open the
site, you're reading that cached card — instant, and the same for anyone
who visits that day. If the cron ever misses a day, the site generates
on-the-fly for the first visitor instead, so it never just breaks.

## What you need before deploying

1. **A GitHub account**, to hold the code.
2. **A Vercel account** (free/Hobby is enough) — [vercel.com](https://vercel.com).
3. **A Gemini API key** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   Free tier, no card required. Used for both topic generation and the
   embeddings that power duplicate detection; usage here (2-3 short
   requests/day at most, even with retries) is nowhere near the free quota.
4. **A YouTube Data API v3 key** — free, from Google Cloud:
   - Go to [console.cloud.google.com](https://console.cloud.google.com), create
     a project (or use an existing one).
   - APIs & Services → Library → search "YouTube Data API v3" → Enable.
   - APIs & Services → Credentials → Create Credentials → API key.
   - The free daily quota (10,000 units/day, a search costs 100) covers this
     site many times over — you will not hit it doing one search a day.

## 1. Push this to GitHub

```bash
cd cabinet
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/cabinet.git
git push -u origin main
```

(Create the empty `cabinet` repo on GitHub first, without a README, so
there's nothing to conflict with.)

## 2. Import into Vercel

1. [vercel.com/new](https://vercel.com/new) → import the `cabinet` repo.
2. Framework preset should auto-detect as Next.js. Leave build settings as
   default.
3. Don't deploy yet — add the storage integration first (next step), or
   deploy once now and redeploy after; either works.

## 3. Add Redis storage (Upstash, via Vercel Marketplace)

This is what caches each day's card and remembers past topics so they don't
repeat.

1. In your Vercel project → **Storage** tab → **Create Database** →
   choose a **Redis** provider (Upstash) from the Marketplace.
2. Follow the prompts to provision it and connect it to this project.
   Vercel automatically injects `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` as environment variables — you don't need to
   copy/paste these yourself.

## 4. Add the remaining environment variables

Project → **Settings** → **Environment Variables**, add:

| Name                 | Value                                              |
| --------------------- | --------------------------------------------------- |
| `GEMINI_API_KEY`      | from aistudio.google.com/apikey                     |
| `YOUTUBE_API_KEY`     | from Google Cloud console                            |
| `CRON_SECRET`         | any long random string, e.g. `openssl rand -hex 32` |

Apply them to all environments (Production, Preview, Development).

## 5. Deploy

Redeploy (Deployments tab → ⋯ → Redeploy, or just push a commit). Vercel
reads `vercel.json` and registers the daily cron automatically — nothing
else to configure. You can trigger it manually any time from **Settings →
Cron Jobs** to generate the first card immediately rather than waiting for
the schedule, or just visit the live URL — the first visit generates a card
on demand if none is cached yet.

## 6. Your fonts

See `public/fonts/README.md` — drop your files in, add a few lines to
`globals.css`, done. The site works and looks finished with the placeholder
fonts in the meantime.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Note that Redis-backed caching still talks to your real Upstash database
even in local dev, since it's a hosted service — that's expected, and fine.

## How the pieces fit together

```
src/
  app/
    page.tsx                 → the page you see; streams the card in
    api/topic/route.ts       → GET: returns today's cached (or freshly
                                generated) card as JSON
    api/cron/generate/route.ts → GET, called only by Vercel's cron:
                                pre-generates *tomorrow's* card
  lib/
    gemini.ts                  → asks Gemini for a topic + description,
                                  and embeds text for similarity checks
    youtube.ts                 → looks up 3 real videos for it
    storage.ts                → Redis: cache, history, counters, locks
    topic.ts                  → ties the above together, including the
                                  duplicate-detection retry loop
    date.ts                   → IST-aware date helpers
```

## How duplicate detection works

`topic.ts` keeps up to 500 past topics in Redis, each as `{ title,
category, embedding }`. For each new card:

1. Gemini drafts a topic, told to avoid every past title + category.
2. The draft gets embedded and compared (cosine similarity) against every
   stored embedding.
3. If the closest match is above `SIMILARITY_THRESHOLD` (0.88, set in
   `topic.ts`) — i.e. it's the same topic reworded, not just a related one
   — it retries, up to 4 attempts, steering each retry away from what it
   just rejected too.
4. If every attempt is still too similar, it uses the least-similar one
   rather than failing the day's card outright.

This is a threshold you'll likely want to tune after watching real output
for a few weeks — raise it if genuinely distinct topics are getting
rejected, lower it if near-repeats slip through.

## Extending it later

A few natural next steps if you want them, none of which need
architecture changes:

- **An archive page** listing past cards — the data's already sitting in
  Redis (`cabinet:topic:{date}` for 45 days), just needs a page that lists
  and links to them.
- **More sources per card**, or a mix of YouTube + articles (e.g. adding a
  web-search step alongside the YouTube call in `topic.ts`).
- **Category filters** ("only give me tech/history days") — would need a
  small settings mechanism since there's no user login here.
