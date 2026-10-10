# Roadmap: M9 onward

M1 to M8 built the first playable game (`docs/HANDOFF.md`, sections A to E). This is the second arc. It comes from the first playtest and the design review of 2026-10-09 (`docs/DESIGN_REVIEW.md`).

## How this arc works

1. **One milestone per Claude Code session**, built from a spec in `docs/specs/`.
2. **A playtest at each checkpoint below.** Notes go in `docs/PLAYTEST.md`.
3. **The next spec is written after the playtest**, in chat with the `game-design` skill, from what the playtest showed. Only M9 and M10 have specs now. Writing the rest today would mean guessing at problems that M9 and M10 will change.
4. **Before each spec**, the briefs below say what has to be researched first.

## The order

| # | Name | What it fixes | Size | Spec |
|---|---|---|---|---|
| M9 | Worth buying | Purchases that never pay back; hoarding for unlocks | Small: config, one rule, tooling | `specs/M9-worth-buying.md` |
| M10 | Show what it did | "Couldn't tell how much it was helping"; a 1-minute day | Medium: two sim functions, three screens | `specs/M10-show-what-it-did.md` |
| | **Playtest 2** | | | |
| M11 | A reason to change the plan | Recipe and price are solved (lazy play earns 98%) | Medium | After Playtest 2 |
| M12 | Something to aim for | 79% of days with nothing to buy or unlock; nothing after the milestones run out | Small to medium | After M11 |
| | **Playtest 3** | | | |
| M13 | A map worth exploring | "Didn't understand the purpose of buying multiple parts of the map"; choosing a spot by foot traffic | Large | After Playtest 3 |
| M14 | People and skills | Staff as a percentage bonus; skill trees and point allocation | Medium to large | After M13 |
| | **Playtest 4** | | | |
| M15 | A day worth watching | Skipping every day; setbacks and bankruptcy | Large: the sim becomes stepped | After Playtest 4 |
| M16 | Look and sound | Graphics, music and sound like a full game | Large | After M15 |

## Why this order

- **M9 before M10.** If the game showed honestly what purchases do today, it would show that they do nothing.
- **M9 and M10 before M11.** They are the cheapest fixes and they answer three of the five playtest complaints. M11 changes formulas and needs more care.
- **M12 right after M11.** Goals written before the daily decisions matter would reward waiting.
- **M13 and M14 after that.** A new location or a skill point is only interesting once the daily plan is. Both also need research first.
- **M15 late.** Mid-day play needs the sim rebuilt to run in steps. That is the riskiest change, and it is safer once the economy has stopped moving.
- **M16 last.** Art made before the systems settle gets redone.

**How sure is this order?** About 60% that it is the best one. The main alternative is M11 first, at about 25%: recipe boredom was the first thing Benjamin named. M12 first is about 15%. If Playtest 2 still names the recipe as the main problem, nothing is lost, because M11 is next anyway.

## Briefs for M11 to M16

These are starting points for the spec, and they will change.

### M11: A reason to change the plan

- **Problem:** "I was bored when things got monotonous on the recipe." Never changing recipe or price earns 98% of careful play.
- **Feeling:** reading tomorrow's crowd and weather and making a call.
- **Candidate rules:** customer types that disagree about sourness as well as sweetness; a forecast of tomorrow's crowd; quality that affects sales the same day, through visibly happy or unhappy customers; a way to respond to a competitor cart.
- **Research first:** how Game Dev Tycoon keeps its fit matrix from becoming a lookup table. Knowledge base entries B1, B2, D3.
- **Done when:** lazy play earns at most 85% of Sensible play, and the best recipe differs between locations and between kinds of day.

### M12: Something to aim for

- **Problem:** 79% of days have nothing to buy or unlock. "Endless sandbox but needs to have incentives."
- **Feeling:** there is always something a day or two away.
- **Candidate rules:** a ladder of short goals; targets set from the player's own best day; star ratings per location; a weekly summary as a stopping point.
- **Research first:** how RollerCoaster Tycoon scenarios, Dorfromantik quests and Kairosoft games pace goals (`UNKNOWNS.md` U4). Knowledge base entries A2, A3, G5, G6, G9.
- **Done when:** no more than four days in a row pass without a purchase, an unlock or a goal completed.

### M13: A map worth exploring

- **Problem:** "I didn't understand the purpose of buying multiple parts of the map." Benjamin wants to choose where the stand goes within an area.
- **Feeling:** scouting a neighborhood and finding the spot.
- **Candidate rules:** each location has its own problem to solve; several spots per location with foot traffic that changes by hour; a traffic overlay; two of your own stands nearby take sales from each other.
- **Research first:** a teardown of Lemonade Tycoon 2's locations, and whether spot choice stays interesting after the first day (`UNKNOWNS.md` U5). Knowledge base entries E1 to E5, C3, C8.
- **Done when:** every location is the best choice for some kind of day, and a bot that never moves its stand earns clearly less.

### M14: People and skills

- **Problem:** staff are a percentage bonus. Benjamin wants skill trees and point allocation.
- **Feeling:** building a business that is recognizably mine.
- **Candidate rules:** staff roles that do a job the player can see, such as a restocker; handing over a mastered chore; a tree of about 24 nodes in four branches, with points from milestones.
- **Research first:** what staff are for (`UNKNOWNS.md` U6); Kingdom Rush's forked upgrades. Knowledge base section 7 and entries F2, F4, G1.
- **Done when:** no skill build is more than 15% ahead of the tenth best, and every staff role earns its wage somewhere.

### M15: A day worth watching

- **Problem:** the day is a replay, so skipping costs nothing. Benjamin wants a reason not to skip, with skip still there. He also wants setbacks, with bankruptcy possible.
- **Feeling:** being at the stand on a busy afternoon.
- **Candidate rules:** the sim runs in steps and accepts commands; one or two optional abilities on a cooldown; one event per day with a sensible default; skipping hands the day to a default policy; a cash runway warning and rescue options before bankruptcy.
- **Research first:** whether a 1-minute day leaves room for a choice (`UNKNOWNS.md` U3). Knowledge base section 8.
- **Done when:** skipping earns 90 to 95% of an attentive day, and the stepped sim gives the same results as the old one for the same inputs.

### M16: Look and sound

- **Problem:** Benjamin wants graphics, music and sound design like a full game, in the direction of Lemonade Tycoon 2.
- **Feeling:** a place he likes looking at.
- **Candidate rules:** one palette and interface kit; animated feedback on sales and walk-aways; time of day and weather; music that follows the day; original or CC0 assets only.
- **Research first:** knowledge base section 10.
- **Done when:** Benjamin says it looks and sounds like a finished game.
