# Handoff to Chat: Squeeze City v2 brainstorm

**Date:** 2026-10-10. **From:** Claude Code (repo `Kickerbocker/Squeeze-City`). **To:** Claude in Chat, Game Development project.
**How to use:** Benjamin uploads this file, plus the play log `docs/playtests/2026-10-10-playtest2-seed1160044776-day24.json` if he wants, at the start of a chat. This file is self-contained. Everything Chat needs is here or quoted.

---

## 1. Your job in this chat

Help Benjamin turn his new direction into a game worth building, using research and brainstorming. **Write no code.** Produce decisions and documents that Claude Code builds from.

Work in this order and stop for Benjamin's input at every ⏸:

1. **Brainstorm** the v2 game with him, using the inputs in sections 3 to 6. ⏸ Agree on the fantasy and the pillars.
2. **Research** what is still unknown (section 8). Teardowns of reference games, real-world numbers for the food-business ladder, and art and music direction. ⏸ Show findings that change the design.
3. **Design** the v2 core: the loop at each step of the ladder, and the *decision of the day* (section 7). ⏸ Benjamin approves.
4. **Hand back** to Claude Code in the format in section 10: a GDD v2 draft, a prototype spec, and a roadmap.

Use the `game-research` skill for step 2 and `game-design` for step 3, if the project has them.

---

## 2. Who Benjamin is and how he works

- He builds this game for himself, for nostalgia: a spiritual successor to **Lemonade Tycoon 2** with original assets, not for sale. It's a mobile-first browser game he plays on his phone.
- **Games he likes:** Lemonade Tycoon 2, RollerCoaster Tycoon, Game Dev Tycoon, Thrillville, Cities: Skylines, Kairosoft games, Restaurant City, Kingdom Rush.
- **What he always wants:**
  - "Calm and cozy but stimulates the brain."
  - "Endless sandbox but needs to have incentives."
  - Setbacks are real, and "bankruptcy is possible if finances are bad enough".
  - Skill trees and point allocation.
  - More realism about running a business.
  - A day worth watching, with a reason not to skip, though skipping stays available.
  - A day of about 1 minute.
- **How he likes to work:**
  - He gives the direction and expects Claude to do the legwork. "Tell me what I need to do if you can't just do it yourself."
  - He approves plans, then lets Claude carry them through, merging pull requests included.
  - He answers concrete choices quickly. Offer 2 to 4 options with a recommendation.
  - He playtests on his phone and exports a play log, so he doesn't have to describe what he did.

---

## 3. His new direction, in his words (2026-10-10, after Playtest 2)

> "The math didn't make sense much. Not sure what any of show the math worked or helped at all. Is it per customer or something? It didn't make much sense."

> "The music felt more ominous than relaxing. It should be a relaxing but upbeat and fun melody."

> "The visuals should be way more appealing, similar to lemonade tycoon 2."

> "I feel like the game didn't really change much day by day. Not much thinking or problem solving, and got mundane really quick."

> "Maybe add some more game elements from the other referenced games such as restaurant city. Maybe add what other things a lemonade stand can add eventually. Or maybe even own a restaurant eventually?"

> "Start off as someone who want to hustle and start off small. Do small gigs, gain skills, build and earn money, buy other things that make money like vending machines or other side hustles all in the food space as a individual entrepreneur who only wants to work for him/herself. Eventually a lemonade stand, then food stand, then food truck, restaurant, etc. with more curation of food recipes, finding trends or new taste palettes and or add new things to sell. Do further research."

> "Before rebuilding, curate a plan… It's time to pick it up substantially. Much more research and development."

> On this handoff: "This must always constantly improve the most efficient way."

**Earlier the same day:**

> "Write an internal report in the game that doesn't affect the gameplay. It's mainly for you to analyze for any gameplay mechanics so I don't have to describe it to you… It's like a self auditing and record tracking." *(Built: the play log, section 5.)*

> "Improve game sounds audio and add music for ambience and relaxing that also changes with the ambience. And update graphics so it's more visually appealing." *(Built in PR #6. Playtest verdict: the music sounds ominous, and the visuals are still not appealing enough.)*

**First playtest (2026-10-09):**
- Bored when the recipe got monotonous.
- Little incentive to buy upgrades or staff.
- Had to hoard money and skip days to reach the next stage.
- Couldn't tell what purchases did.
- Didn't understand why to buy other parts of the map.

---

## 4. What exists today (the v1 build)

- **Stack:** TypeScript, Vite, Phaser 3 for the street scene, plain DOM for menus, a PWA on GitHub Pages. Deploys from `main`.
- **Architecture worth keeping:**
  - A pure, deterministic simulation: seeded RNG, every value in config JSON, and an event log the street scene replays.
  - Versioned saves with migrations.
  - Balance bots and a decision audit.
  - The play log.
  - A Web Audio engine.
  - 120 unit tests.
- **The game itself:**
  - One lemonade stand. Each morning you buy stock and set the recipe (lemons/sugar/ice) and price, then watch a replayed day.
  - Customers are 7 archetypes, with weather and forecast, reputation, and 7 locations unlocked by money earned.
  - Up to 4 stands, upgrades (cart → stall → kiosk → shop, juicer, register, neon, speaker), staff (server, promoter), 4 ad campaigns, random events, and milestones.
- **This session's milestones (PRs #2 to #6):**
  - **M9:** purchases pay back.
  - **M10:** a projection before buying ("About +$7 a day here"), a "What your purchases did today" report card, a purchase ledger, and a 1-minute day.
  - **Play log.**
  - **Generated music and ambience, and a visual pass.**
- **Numbers:** balance 10/10. The audit shows the core problem: never changing your recipe or price still earns **97%** of what careful play earns, and 80% of days have nothing to buy or unlock.
- **Art:** everything is drawn in code as flat vector shapes. Audio is synthesized in code, with no asset files. That is a real ceiling on "appealing like Lemonade Tycoon 2" (section 9).

---

## 5. What his Playtest 2 log shows (23 game days, 14 real minutes)

| Signal | Value | What it means |
|---|---|---|
| Days skipped | 19 of 23 (83%), median at 9:22 AM | Watching the day has no value. |
| Recipe changes | 0 after day 1 | The recipe is a solved, one-time setting. |
| Price | $0.50–$0.65, against a best price of about $1.05–$1.40 | He underpriced by half and the game never told him. Only 4% of customers said "too expensive". |
| Mornings that only bought stock | 74% (median 14 s of planning) | The morning is a chore. |
| Days with nothing bought or unlocked | 83% | There's nothing to aim for. |
| Sold-out days | 4. Up to 208 customers turned away in a day, mostly on days he skipped | The biggest drama happened off-screen. |
| Promoter | Hired day 8. The report showed about −$13 a day. Fired day 18 | **After-the-fact feedback works.** |
| "Show the math" | Opened on days 1–2 only | The before-buying explanation failed. |
| New location | Uptown unlocked day 10, never used | Locations don't pull him in. |
| Net worth | $114 → $303 | Slow, flat growth. |

**The log can grow.** If the v2 design needs a measurement (for example "how often did he try a new recipe" or "time spent in the menu editor"), name it in the hand-back and Code will add it.

---

## 6. Lessons already learned (don't repeat these)

1. Pacing targets passing ≠ fun. The first build passed every balance target and was boring.
2. Fixing the economy can't create decisions the core loop doesn't have. Design the daily decision first, then tune the numbers.
3. Explain things in plain cause and effect with the player's own numbers ("14 more people stopped because of the sign"), never in model parameters ("×1.15 → ×1.35").
4. Progress gates count money earned, never cash in hand. Saving up for an unlock made him skip days.
5. A purchase should fix a problem the player can already see.
6. A new location must be visibly different, or better in a way shown before he commits.
7. Waiting must never be the best move. Each day needs something within reach.
8. "Relaxing and upbeat" means major keys, a bouncy rhythm and bright instruments. Get a reference track from him before composing.
9. Read and test before declaring something impossible.

---

## 7. Starting points for the brainstorm (ideas, not decisions)

**The fantasy:** a solo food hustler who climbs from nothing to a food empire, always self-employed.

**A possible ladder.** Each rung adds one new kind of decision, not just bigger numbers:

| Rung | New decision it adds | Possible passive side hustle |
|---|---|---|
| Gigs (delivery runs, catering helper, farmers-market shifts) | Which gig today: pay against the skill it builds | none yet |
| Lemonade stand | Recipe, price and stock against weather and crowd | |
| Food stand / cart | A small menu: which items to offer, shared ingredients | Vending machines (restock route, placement) |
| Food truck | Where to park each day: events, office parks, festivals | Snack kiosks |
| Restaurant | Menu design, decor, seating, staff schedules (Restaurant City) | Franchise or catering line |

**Candidate systems that give every day a decision:**
- **Trends.** A flavour or dish is rising this week, for example boba, smash burgers or yuzu. Catch it early for big margins; it fades. This is Game Dev Tycoon's trend matching.
- **Recipe discovery.** Combine ingredients to find recipes, with quality stars and customer tastes by neighbourhood. This is Kairosoft and Restaurant City.
- **Customer orders and regulars.** Named regulars with tastes, requests and loyalty. Good Pizza, Great Pizza does this.
- **One event a day with a choice.** A festival nearby, a supplier deal, a health inspection or a rival opening.
- **Skills.** Gigs and work give XP for cooking, salesmanship, negotiation and logistics, plus a skill tree.
- **Owned assets.** Vending machines and kiosks earn while you work elsewhere, but need restocking routes. That's the decision.

**Questions to settle with him early:**
1. **Art route:**
   - CC0 asset packs.
   - AI-generated sprites in one consistent style.
   - Paid or commissioned art.
   - Stay drawn in code.
2. **Feel of a day:** plan then watch, or hands-on moments during the day such as taking orders or handling an event.
3. **Scope of v1 of v2:** how many rungs to build first? A recommendation: gigs plus the lemonade stand plus one side hustle, done really well.
4. **Music:** a reference track or two he likes.

---

## 8. Research to do (and how)

1. **Teardowns:** Lemonade Tycoon 2, Restaurant City, Kairosoft food games (Cafeteria Nipponica, Ramen Sensei), Good Pizza Great Pizza, Cook Serve Delicious, Big Ambitions, AdVenture Capitalist, Game Dev Tycoon. For each, ask:
   - What decision does the player make every day?
   - How is progress paced?
   - What makes it look and feel appealing?
   - What should we borrow?
2. **Real-world grounding:** typical costs and earnings for each rung (stand, cart permit, vending machine, food truck build-out, small restaurant), and how food trends rise and fade. This keeps the numbers plausible, not exact.
3. **Art and music direction:**
   - What specifically made Lemonade Tycoon 2 appealing: the camera, the palette, the animation, the readable crowds.
   - Realistic options for a solo, non-commercial project, with the effort each takes.
   - Music references for "relaxing but upbeat".
4. Every finding that holds beyond this game goes into the knowledge base (`docs/research/KNOWLEDGE.md`) when Code commits your documents.

---

## 9. Constraints Chat must respect

- Original assets only: nothing copied from Lemonade Tycoon 2 or any other game. CC0 or properly licensed assets are fine if Benjamin agrees.
- Mobile-first: 390×844, touch targets at least 44 px, no hover-only interactions.
- The sim stays deterministic: seeded RNG, values in config, testable. The UI layer can be anything.
- New runtime dependencies need Benjamin's OK.
- Keep what works: the play log, the bots and audit, saves, and the after-the-fact purchase report.

---

## 10. Hand-back format (what Code needs from Chat)

When Benjamin approves the design, produce these as files for him to upload to Claude Code. Keep each one tight.

1. `docs/GDD-v2.md`:
   - The fantasy, the pillars, and the ladder.
   - The core loop at each rung, and the decision of the day.
   - Every system with its numbers as starting values, and what carries over from v1.
2. `docs/specs/P1-prototype.md`: a plain, art-free prototype of the core loop to playtest the fun first, with "Done when" checks.
3. `docs/ROADMAP-v2.md`: milestones after the prototype, each with the problem it solves and the playtest question it answers.
4. `docs/research/BRIEF-v2.md`: the research findings, with sources.
5. **A paste-in prompt for Claude Code** (the template is below).
6. **Play log additions** the design needs.

**Prompt template for Code:**
```
Read CLAUDE.md, docs/GDD-v2.md and docs/specs/P1-prototype.md. Use the game-build-verify skill.
Build P1 exactly as the spec says on a branch named claude/p1-prototype and open a pull request.
Propose your plan first and wait for my approval.
```

---

## 11. The improvement loop (how this gets better every round)

Every round goes Chat (research and design) → Code (build and measure) → Benjamin (playtest and play log) → Chat. Each step ends by improving the next one.

**Every Chat session ends by:**
1. Adding new lines in Benjamin's own words to the TASTE list (section 2 or 3 of this file).
2. Writing at most 3 new lessons, and deleting any lesson the playtest disproved.
3. **Rewriting this handoff:** update sections 3 to 7, cut anything stale, and add a changelog line at the bottom. It must stay self-contained and shorter than it was, unless something new genuinely needs the space.
4. Naming the next playtest's 3–5 questions, which must not lead the answer.

**Every Code milestone ends by:**
1. Running the tests, balance and audit, and reporting every failure.
2. Updating `docs/learning/LESSONS.md` with what each bet produced.
3. Adding play log measurements that the next playtest questions need.

**Every playtest ends by:**
1. Benjamin exporting the play log (☰ → Stats → Export play log) and writing a few lines in his own words.
2. Code running `npm run playlog -- <file>` and recording the session in `docs/PLAYTEST.md`.

**Efficiency rules:**
- One source of truth per topic: GDD for rules, TASTE for his taste, LESSONS for what we learned, and this file for the handoff.
- Ask Benjamin at most 3 questions at a time, as concrete options with a recommendation.
- Prototype the fun before investing in art or polish.
- Measure, don't guess. If a question can be answered by the play log, a bot or a quick prototype, do that instead of debating.
- A lesson confirmed twice becomes a principle. A rule contradicted twice is removed.

---

## Changelog
- 2026-10-10: First version. Written by Claude Code after Playtest 2 and Benjamin's request for a v2 direction.
