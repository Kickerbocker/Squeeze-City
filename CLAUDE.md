# Squeeze City — instructions for Claude Code

A personal browser game, mobile-first. It is a spiritual successor to Lemonade Tycoon 2, built entirely from original assets.

- **Design source of truth:** `docs/GDD.md`
- **Milestone plan:** `docs/HANDOFF.md`
- **Decisions log:** `docs/DECISIONS.md`
- **Ideas parking lot:** `docs/LATER.md`

## Stack
- TypeScript (strict), Vite, Vitest
- Phaser 3 for the day scene only
- Plain DOM + CSS for menus and screens (`src/ui`), which is easier for touch and layout
- vite-plugin-pwa at the polish milestone
- No other runtime dependencies without asking first

## Architecture (non-negotiable)
```
src/
  sim/      pure game logic: no DOM, no Phaser, no Math.random, no Date
  config/   all tunables as JSON + typed loader (zod or hand-written guards)
  game/     Phaser day scene; replays the sim event log
  ui/       DOM screens; reads state, dispatches actions
  save/     versioned localStorage saves + migrations
scripts/
  balance.ts  headless bot runs against GDD §17
```

1. **The sim is deterministic.** Pass a seeded RNG (`sim/rng.ts`, mulberry32) everywhere. The same seed and the same inputs must give the same result.
2. **Sim API:**
   - `newGame(config, seed)`
   - `runDay(state, plan) → { state, events, report }`
   - Rendering replays `events` (arrivals, decisions, bubbles, sales). It never computes outcomes itself.
3. **No magic numbers in `sim/`.** Every value from the GDD lives in `src/config/*.json`.
4. **UI and game layers never mutate state directly.** They dispatch actions to the sim.
5. **Save format** is `{ version, state }`. Bump `version` and add a migration whenever the state shape changes.

## Workflow rules
- Before each milestone, read the relevant GDD sections, propose a short plan, and wait for approval.
- Every sim formula gets unit tests. `npm test` must pass before you say something is done.
- After any sim or config change, run `npm run balance` and report the results against the GDD §17 targets.
- Commit at every green step, with clear messages.
- Build only what the GDD specifies. Put new ideas in `docs/LATER.md`.
- If the GDD is ambiguous, pick the simplest option and log it in `docs/DECISIONS.md`.
- Mobile-first: design at 390×844, with touch targets of at least 44px and no hover-only interactions.
- End each milestone with a short summary: what was built, test and balance status, known issues, and what to playtest.

## Commands
- `npm run dev` — local dev server, reachable on LAN for phone testing (`--host`)
- `npm test` — Vitest
- `npm run balance` — headless balance report
- `npm run build` — production build
