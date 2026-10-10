# Handoff between Chat and Code: Squeeze City v2

**Updated:** 2026-10-10, by Claude in Chat. **Repo:** `Kickerbocker/Squeeze-City`.
**How to use:** this file says where v2 stands and what happens next. It is self-contained. Whoever picks it up, in Chat or in Code, reads this first.

---

## 1. Where things stand

- Benjamin asked for a redesign after Playtest 2. Chat researched it and drafted the design.
- **The draft is waiting for his approval.** Nothing in it is approved to build.
- The v1 game on `main` is unchanged and still plays.

| File | What it is |
|---|---|
| `docs/GDD-v2.md` | The design draft |
| `docs/research/BRIEF-v2.md` | The research, with sources and what was not checked |
| `docs/specs/P1-prototype.md` | The first prototype: gigs, market table, drink stand, plain look |
| `docs/ROADMAP-v2.md` | P1 to P7, with each step's playtest question |
| `scripts/paper-economy-v2.mjs` | Starting numbers and their checks: `npm run paper` (17 of 17 pass) |

## 2. What is waiting on Benjamin

1. **Approve the direction** in `docs/GDD-v2.md`: the fantasy, six pillars, the ladder, and the rule of at most three decisions a day.
2. **Going broke:** step down one stage and keep skills and recipes (proposed), restart from gigs, or reload a save.
3. **The city:** a made-up city with a Nashville feel (proposed), or real Nashville neighborhoods.
4. **Music:** one or two songs or soundtracks that sound "relaxing but upbeat and fun" to him. Nothing is composed without this.

## 3. The next step once he approves

Paste into Claude Code:

```
Read CLAUDE.md, docs/GDD-v2.md and docs/specs/P1-prototype.md. Use the game-build-verify skill.
Build P1 exactly as the spec says on a branch named claude/p1-prototype and open a pull request.
The v1 game must keep working; P1 is its own mode with its own save.
Start from the numbers in scripts/paper-economy-v2.mjs. Add the play log fields the spec lists.
Propose your plan first and wait for my approval.
```

Then Playtest 3: play to the food cart unlock (about 20 game days), export the play log, and answer the five questions at the end of the P1 spec. Bring both to Chat for the P2 spec.

## 4. Who Benjamin is and how he works

- He builds this for himself, to play on his phone. Original assets, not for sale.
- **Games he likes:** Lemonade Tycoon 2, RollerCoaster Tycoon, Game Dev Tycoon, Thrillville, Cities: Skylines, Kairosoft games, Restaurant City, Kingdom Rush.
- **How he works:** he gives the direction and expects Claude to do the legwork. He answers concrete choices quickly, so offer two to four options with a recommendation, and at most three questions at a time. He playtests on his phone and exports a play log.
- Everything he has said about what he likes is in `docs/learning/TASTE.md`. It outranks every other document.

## 5. The design in one screen

- **Fantasy:** a food hustler who starts with a bike and a home kitchen, only ever works for himself, and ends up with businesses all over the city.
- **The ladder:** gigs → market table → drink stand (with vending machines alongside) → food cart → food truck → contracts → restaurant → second location. His first ladder was a suggestion; this one follows how people really start in Tennessee.
- **Each stage adds one decision:** which gig; how much to make; what to charge; where to set up; the route; which jobs to take; the seasonal menu and staff; who runs what.
- **At most three decisions a day.** When a new one arrives, an old one can be handed off through a skill or a hire. A handed-off decision earns a little under careful play.
- **Recipes reward and never nag.** Dishes get better with use. New ones are a bonus when a season, a trend or a skill makes them timely.
- **A day:** a morning board, one minute of watching, and a report that says what was earned and what was missed. Mostly planning, in the flow of Restaurant City.
- **Look and sound:** free 3D kits rendered to 2D plus AI-generated icons, under one palette; layered major-key loops. Both start after the prototype shows the days are worth playing.

## 6. What his reactions have settled

| He said | So |
|---|---|
| Art: free asset packs and AI-generated sprites are both fine | Both are in the recommended art route |
| "Mostly planning, strategizing. I like the flow of restaurant city." | No hands-on serving |
| "We are not going to just limit ourselves to lemonade tycoon 2" | The research looked at about a dozen games; lemonade is the first product, one of many |
| "The penalty for old recipes is too hard… Don't penalize but rather incentivize" | The menu-fatigue idea was dropped |
| "So you don't have to constantly think about it all the time… Eventually, it should be automated" | The three-decision rule and hand-offs |

## 7. What Playtest 2's log showed (23 game days, 14 minutes)

| Signal | Value |
|---|---|
| Days skipped | 83%, most within seconds |
| Recipe changes after day 1 | 0 |
| Price | $0.50 to $0.65, when about $1.05 to $1.40 was best. Nothing told him. |
| Mornings that were restocking only | 74% |
| Days with nothing bought or unlocked | 83% |
| Worst sell-out | 208 customers turned away, on a skipped day |
| What worked | A report card showing a hire losing about $13 a day. He fired him. |
| What did not | "Show the math" before buying. Opened on days 1 and 2 only. |

## 8. Lessons that must not be repeated

1. Passing pacing targets is not fun.
2. Fixing an economy cannot create decisions the core loop lacks. Design the daily decision first.
3. Explain in plain cause and effect with the player's own numbers, after the fact.
4. Unlocks count money earned, never cash in hand.
5. A purchase fixes a problem the player can already see. A new place is visibly different.
6. Waiting must never be the best move.
7. Get a reference track before composing music.
8. Read and test before declaring something impossible.
9. Reward the new thing; never punish the familiar one. Check a research recommendation against `TASTE.md` before presenting it.
10. Cap the decisions a stage asks for, and offer a hand-off with each new one.

The full list with evidence is `docs/learning/LESSONS.md`.

## 9. Constraints

- Original assets only. CC0 or properly licensed assets are fine. Nothing is copied from any game.
- Mobile-first: 390×844, touch targets of at least 44 px, nothing that needs hover.
- The simulation stays deterministic: seeded randomness, values in config, testable.
- New runtime dependencies need Benjamin's approval.
- Keep what works: the play log, the bots and audit, saves, the after-the-fact report.

## 10. The loop each round follows

Chat (research and design) → Code (build and measure) → Benjamin (playtest and play log) → Chat.

**Every Chat session ends by:**
1. Adding his new words to `docs/learning/TASTE.md`.
2. Writing at most three new lessons, and removing any a playtest disproved.
3. Rewriting this file so it is current, self-contained and no longer than it was.
4. Naming the next playtest's questions, which must not lead the answer.

**Every Code milestone ends by:**
1. Running the tests, balance, audit and `npm run paper`, and reporting every failure.
2. Filling in what each bet in `docs/learning/LESSONS.md` produced.
3. Adding the play log measurements the next playtest needs.

**Every playtest ends by:**
1. Benjamin exporting the play log (☰ → Stats → Export play log) and writing a few lines.
2. Code running `npm run playlog -- <file>` and recording the session in `docs/PLAYTEST.md`.

**Rules for efficiency:** one source of truth per topic (GDD for rules, TASTE for his taste, LESSONS for what was learned, this file for where things stand). Prototype the fun before art or polish. If the play log, a bot or a quick prototype can answer a question, use that.

---

## Changelog

- 2026-10-10 (Chat): Rewritten after the research and design round. Sections on research to do and brainstorm starting points were replaced by where things stand, what is waiting on Benjamin, and the next step.
- 2026-10-10 (Code): First version, after Playtest 2 and Benjamin's request for a v2 direction.
