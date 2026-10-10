# Squeeze City — instructions for Claude Code

A personal browser game, mobile-first. It is a spiritual successor to Lemonade Tycoon 2, built entirely from original assets.

- **Design source of truth:** `docs/GDD.md` for the game that exists. `docs/GDD-v2.md` is the draft for the next game. Do not build from it until Benjamin has approved it.
- **v2 research, roadmap and first spec:** `docs/research/BRIEF-v2.md`, `docs/ROADMAP-v2.md`, `docs/specs/P1-prototype.md`
- **v2 starting numbers:** `scripts/paper-economy-v2.mjs`, checked with `npm run paper`
- **Milestone plan:** `docs/ROADMAP.md` (M9 onward), with paste-in prompts in `docs/HANDOFF.md` section F
- **Specs:** `docs/specs/` (one per milestone; build from these)
- **Why the current build falls short:** `docs/DESIGN_REVIEW.md`
- **Decisions log:** `docs/DECISIONS.md`
- **Ideas parking lot:** `docs/LATER.md`
- **What Benjamin finds fun:** `docs/learning/TASTE.md` (outranks everything else)
- **Lessons and open questions:** `docs/learning/LESSONS.md`, `docs/learning/UNKNOWNS.md`
- **Design principles:** `docs/research/PRINCIPLES.md` (rules this game has adopted)
- **Game design knowledge base:** `docs/research/KNOWLEDGE.md` (what we know about any strategy, sim or idle game; updated as we learn)

## Skills
Three skills in `.claude/skills/` cover the work in order. Use the one that matches what you are doing.
- `game-research` when a design question has no confident answer yet
- `game-design` when deciding what the game should do
- `game-build-verify` when writing code, changing numbers or checking a build

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
- After any sim or config change, run `npm run balance` and `npm run audit` and report both. Balance checks pacing; the audit checks that the player's choices and purchases matter.
- Work on a branch and open a pull request. `main` deploys the live game.
- Commit at every green step, with clear messages.
- Build only what the GDD and the milestone's spec specify. Put new ideas in `docs/LATER.md`.
- If the GDD is ambiguous, pick the simplest option and log it in `docs/DECISIONS.md`.
- Mobile-first: design at 390×844, with touch targets of at least 44px and no hover-only interactions.
- End each milestone with a short summary: what was built, test and balance status, known issues, and what to playtest.

## Commands
- `npm run dev` — local dev server, reachable on LAN for phone testing (`--host`)
- `npm test` — Vitest
- `npm run balance` — headless balance report
- `npm run paper` — checks the v2 design's starting numbers (a paper model, no game code)
- `npm run audit` — decision audit (`-- --loc financial` to test another location)
- `npm run build` — production build
