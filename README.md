# Squeeze City 🍋

A mobile-first browser game about growing one lemonade cart into stands across the city. It's a personal spiritual successor to Lemonade Tycoon 2, and all art and sound are generated in code.

- Design: [`docs/GDD.md`](docs/GDD.md) · Plan: [`docs/HANDOFF.md`](docs/HANDOFF.md) · Decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md) · Parking lot: [`docs/LATER.md`](docs/LATER.md)

## Commands
| Command | What it does |
|---|---|
| `npm install` | Install dependencies (Node 22 LTS) |
| `npm run dev` | Dev server, reachable on your LAN for phone testing (open the "Network" URL it prints) |
| `npm test` | Unit tests (Vitest) |
| `npm run balance` | Headless balance report against GDD §17 (20 seeds × 260 days, about 1.5 min). Add `-- --seeds 4 --days 120` for a quick run, or `--set customers.decision.stopBase=0.3` to try a config value |
| `npx tsx scripts/trace.ts 1 60` | Day-by-day trace of the Sensible bot (seed 1, 60 days) |
| `npm run build` | Type-check plus production build (with an offline service worker) into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npx tsx scripts/make-icons.ts` | Regenerate the app icons in `public/` |

## Layout
```
src/sim      deterministic game logic (seeded RNG, no DOM/Phaser/Date)
src/config   every tunable as JSON + hand-written validators
src/game     Phaser day scene + pure replay model of the sim's event log
src/ui       DOM screens (title, hub tabs, day HUD, report, stats), Web Audio
src/save     versioned localStorage saves ({ version, state }) + migrations
scripts      balance bots, balance report, trace, icon generator
```

## Deploy to GitHub Pages
The workflow in `.github/workflows/deploy.yml` tests, builds and publishes `dist/` on every push to `main`.

1. Merge this branch into `main` (or change `branches:` in the workflow to the branch you want to deploy from).
2. On GitHub, open **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main`, or run the workflow by hand from **Actions → Deploy to GitHub Pages → Run workflow**.
4. When it finishes, the site is at `https://<your-username>.github.io/<repo-name>/` (the URL also appears on the workflow run).
5. **Install on your phone:** open that URL in the phone's browser.
   - **iPhone (Safari):** tap Share, then **Add to Home Screen**.
   - **Android (Chrome):** tap ⋮, then **Install app**.

   After the first visit, the game also works offline.

The build uses relative paths (`base: './'`), so it works under any repo name with no extra config.
