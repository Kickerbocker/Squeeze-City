# Handoff — building Squeeze City in Claude Code

## A. One-time setup (about 30 minutes)
1. **Install the tools:**
   - Node.js (current LTS) from nodejs.org
   - Git from git-scm.com
   - The Claude desktop app, then open its **Code** tab. Setup docs: https://docs.claude.com/en/docs/claude-code/overview
2. **Create a folder** called `squeeze-city` and set it up like this:
   ```
   squeeze-city/
     CLAUDE.md
     docs/GDD.md
     docs/HANDOFF.md
   ```
3. **Open the folder in Claude Code** and select **Opus 5.5**.
4. **Paste the M1 prompt** below.

## B. Session habits
- **One milestone per session.** Start a fresh session (`/clear`) between milestones so old context doesn't pile up.
- **Plan first:** let it propose a plan, read it, then approve. Push back if it adds features that aren't in the GDD.
- **Done means done:** a milestone is finished when the tests pass, the balance report is shown where relevant, and the work is committed.
- **If it gets stuck** after 2 or 3 fix attempts on the same bug, start a fresh session with: "Read CLAUDE.md. Bug: <symptom>. What we tried: <list>. Diagnose before changing code."
- **Model choice:**
  - Opus 5.5 for M2, M3, M5, and M6 (sim logic and balance)
  - Sonnet 5.5 is fine for M1, M4, and M7
  - Fable 5.1 only if a balance or architecture problem resists two Opus attempts

## C. Milestone prompts (paste one per session)

**M1 — Scaffold** (Sonnet is fine)
> Read CLAUDE.md and docs/GDD.md. Do milestone M1: scaffold Vite + TypeScript strict + Phaser 3 + Vitest with the folder structure in CLAUDE.md. Add the seeded RNG with tests. Put every numeric value from the GDD into src/config JSON files with a typed loader and tests. Create empty docs/DECISIONS.md and docs/LATER.md. Run git init and make the first commit. Propose your plan first.

Done when `npm run dev` shows a placeholder screen, `npm test` passes, and the config covers GDD §3–§16.

**M2 — Simulation core, single location** (Opus)
> Read CLAUDE.md and GDD §3–§9. Do milestone M2: implement the headless sim for ONE stand at Maple Park. That means weather and forecast, inventory with lemon batches and spoilage and ice melt, recipe quality, the customer decision pipeline, the service queue, reputation, and runDay returning state, an event log, and a report. Unit-test every formula against the GDD. No UI. Propose your plan first.

Done when a test can run 30 seeded days and produce the same output every time.

**M3 — Balance harness** (Opus)
> Read CLAUDE.md and GDD §17. Do milestone M3: build scripts/balance.ts with the Sensible, Greedy, Cheap, and Hoarder bots over 20 seeds. Print a table of each target with its value and PASS or FAIL. Tune only the config JSON (never the formulas without asking me) until the single-location targets pass. Log every tuning change in docs/DECISIONS.md.

Done when all single-location targets pass. Later-game targets are allowed to be N/A for now.

**M4 — Playable vertical slice** (Sonnet, or Opus for the replay system)
> Read CLAUDE.md and GDD §18–§19. Do milestone M4 for ONE location:
> - Title screen with save slots
> - Morning hub with the Shop and Recipe & Price tabs
> - Phaser day view that replays the event log with walking customers, the line, thought bubbles, clock, speed controls, and the weather overlay
> - Evening report
> - Nightly autosave
>
> Mobile-first. Make sure `npm run dev -- --host` works so I can test on my phone. Propose your plan first.

**→ Playtest checkpoint (you):** play 10 or more in-game days on your phone. Write notes in `docs/PLAYTEST.md` (template below). Fix feel issues before moving on. This checkpoint matters most for whether the game ends up fun.

**M5 — Expansion systems** (Opus)
> Read CLAUDE.md and GDD §10–§13. Do milestone M5:
> - Map screen with all locations, unlocks, and rent
> - Stand licenses and assigning stands to locations each night
> - Per-stand recipe, price, upgrades, and staff
> - Shared inventory
> - Day view tabs for each stand
>
> Then extend the balance harness to the later-game targets and tune until they pass. Propose your plan first.

**M6 — Marketing, events, progression** (Opus)
> Read CLAUDE.md and GDD §14–§16. Do milestone M6: marketing campaigns, random events (including Stadium game days), milestones, and the stats screen. Re-run balance until everything passes. Propose your plan first.

**M7 — Polish and install** (Sonnet)
> Read CLAUDE.md and GDD §18–§19. Do milestone M7:
> - Art pass, with consistent flat vector style and distinct archetypes
> - Web Audio sounds with a mute toggle
> - Screen transitions
> - PWA install (vite-plugin-pwa) and an offline check
> - Deploy setup for GitHub Pages, giving me the exact steps

**M8+ — Balance loop** (Opus)
> Read CLAUDE.md and docs/PLAYTEST.md. Turn my newest notes into specific config changes. Confirm `npm run balance` still passes, then summarize what changed and why.

## D. Playtest note template (`docs/PLAYTEST.md`)
```
## Session YYYY-MM-DD (game days X–Y)
- Felt too easy/hard: …
- Confusing UI: …
- Dominant strategy I found: …
- Specific numbers that felt wrong (e.g. "lemons never run out at $0.30"): …
- Bugs: …
```

## E. When to come back to chat
Stay in Claude Code for everything above. Come back to chat only for big design rethinks, such as a new system or a change of direction. Update GDD.md afterward so Claude Code stays in sync.
