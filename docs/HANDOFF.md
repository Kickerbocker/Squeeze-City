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

From M9 onward, section F replaces this rule: chat writes each spec, and Claude Code builds it.

## F. The second arc: M9 onward

M1 to M8 are done. The first playtest found the game boring in specific ways, and `docs/DESIGN_REVIEW.md` explains why. `docs/ROADMAP.md` has the order of work from here.

### What Claude Code has to work from

| File | What it is |
|---|---|
| `CLAUDE.md` | Rules for every session: stack, architecture, workflow, commands |
| `.claude/skills/game-build-verify/` | How to build and check a milestone. Claude Code loads it when building. |
| `.claude/skills/game-design/`, `game-research/` | For spec and research work |
| `docs/GDD.md` (v1.1) | The design. Source of truth for what to build. |
| `docs/specs/M9-worth-buying.md` | Full spec for M9 |
| `docs/specs/M10-show-what-it-did.md` | Full spec for M10 |
| `docs/ROADMAP.md` | Order of M9 to M16, with a brief for each |
| `docs/DESIGN_REVIEW.md` | Why the current build fails, with numbers |
| `docs/learning/TASTE.md` | What Benjamin finds fun. Outranks everything else. |
| `docs/learning/LESSONS.md`, `UNKNOWNS.md` | What we tried, what we bet on, what we don't know |
| `docs/research/KNOWLEDGE.md`, `PRINCIPLES.md` | What we know about these games in general, and the rules this game adopted |
| `scripts/audit.ts` | `npm run audit`: checks that choices and purchases matter |

### One-time step

Merge pull request #2 into `main` so Claude Code sees all of the above. It changes no game code.

### Session habits

The habits in section B still apply. Three additions:

- **Branch and pull request for every milestone.** `main` deploys the live game. Never push to it directly.
- **Three checks, every time:** `npm test`, `npm run balance`, `npm run audit`. Report every failure, including ones that were already failing.
- **Model:** Opus 5.5 for both M9 and M10. Both touch the sim.

### Milestone prompts (paste one per session)

**M9 — Worth buying**
> Read CLAUDE.md, docs/specs/M9-worth-buying.md, and GDD §8, §10, §12 to §14 and §17. Use the game-build-verify skill. Build milestone M9 exactly as the spec says: the config changes, the items taken off sale, unlocks on lifetime revenue, the two new bots, audit version 2, and the changed balance target. Start from the spec's numbers and tune only config until "Done when" passes. Log every value that ends up different in docs/DECISIONS.md. Work on a branch named claude/m9-worth-buying and open a pull request. Propose your plan first and wait for my approval.

Done when the spec's "Done when" list passes and the pull request is open.

**M10 — Show what it did**
> Read CLAUDE.md, docs/specs/M10-show-what-it-did.md, and GDD §18 and §21. Use the game-build-verify skill. Build milestone M10 exactly as the spec says: projectPurchase, attributeDay, runDayWithAttribution, the purchase ledger with its save migration, the three-line purchase cards, the "What your purchases did today" report card, and the one-minute day. runDay must return exactly what it did after M9 for the same seed and plan. Work on a branch named claude/m10-show-what-it-did and open a pull request. Propose your plan first and wait for my approval.

Done when the spec's "Done when" list passes and the pull request is open.

**→ Playtest 2 (you):** merge both pull requests, then play at least 15 in-game days on your phone. Buy things. Note where you were bored, confused, delighted or frustrated, and answer these in `docs/PLAYTEST.md`:

1. What did you buy, and what made you pick it?
2. Think of the last thing you bought. What did you expect it to do? What did it do?
3. Did you open the math? What were you looking for?
4. How did the length of the day feel?
5. Was there a moment you wanted to skip? What was happening?

**After Playtest 2 (Claude Code)**
> Read CLAUDE.md and the newest session in docs/PLAYTEST.md. Use the game-build-verify skill, section "After the playtest". Fill in the results for the M9 and M10 bets in docs/learning/LESSONS.md, add what I liked and disliked to docs/learning/TASTE.md in my words, log surprises in docs/learning/UNKNOWNS.md, and add anything that would hold for another game to section 15 of docs/research/KNOWLEDGE.md. Change no game code.

### Then come back to chat

Bring the playtest notes to the Game Development project in chat and ask for the M11 spec. Chat writes `docs/specs/M11-….md`, updates the GDD and adds the M11 prompt here. The same loop repeats for each milestone in `docs/ROADMAP.md`.

### If something goes wrong

- **A "Done when" check won't pass after honest tuning:** stop and say which one, with the numbers. Do not change a bot's rules or a formula to make it pass.
- **The spec and the GDD disagree:** the GDD wins. Say so, and fix the spec in the same pull request.
- **The spec is silent:** pick the simplest option and log it in `docs/DECISIONS.md`.
