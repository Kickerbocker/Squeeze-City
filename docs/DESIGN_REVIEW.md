# Design review, 2026-10-09

The current build (commit `0f818cf`, GDD v1) checked against the tests in the `game-design` skill. Evidence is Benjamin's first playtest (`docs/PLAYTEST.md`), `npm run audit`, and design experiments run against the sim with changed config. The experiment method and numbers are at the end.

**Result:** the build fails most tests. Of six decisions the player repeats, five fail and one is untested. Of sixteen things for sale, none passes at the starting location. The pacing rule fails. The fixes are ordered in `docs/ROADMAP.md`, and the first two have full specs in `docs/specs/`.

## 1. Decisions the player repeats

Tests: the best answer changes with the situation; the player has the information beforehand; choosing costs another option; the result and its cause are shown.

| Decision | Best answer changes? | Informed? | Tradeoff? | Result shown? | Verdict | Fixed in |
|---|---|---|---|---|---|---|
| Recipe (daily) | No. Never changing it earns 98% of Sensible play. Lemons are always 6. | Yes | Weak. Ingredients are about 15% of the price. | Yes, complaint bubbles | **Fail** | M11 |
| Price (daily) | Barely. Sensible prices range $0.95 to $1.65, yet a fixed $1.30 earns 98%. | Partly | Yes | Yes, "too expensive" | **Fail** | M11 |
| How much stock to buy (daily) | Yes, with the forecast | Yes | Waste against selling out | Yes | **Untested.** Over-buying is punished (Hoarder wastes 33%). Under-buying has no bot. | Add a bot in M9 |
| Where to put each stand (nightly) | No. The ranking is fixed, and the first unlock earns less than the start ($51 against $82 a day). | No. The map gives hints, not numbers. | Rent against traffic | Only in the report | **Fail** | M13 |
| When to run marketing | n/a | No | n/a | No | **Fail.** Every campaign loses money at the first two locations. | M9, M10 |
| Who to hire | n/a | No | n/a | No | **Fail.** Every role loses $43 to $64 a day. | M9 now, M14 properly |

## 2. Things the player can buy

Tests: it fixes a problem the player can already see; the game shows what changed afterwards; it pays for itself in a time the player would wait; it is a choice.

Payback is in days at Maple Park / Campus Quad / Financial District, from the audit.

| Item | Cost | Payback (days) | Fixes a visible problem? | Shows what changed? | Verdict |
|---|---|---|---|---|---|
| Stall | $400 | 50 / 28 / 11 | No. "More people stop" names no problem. | No | Fail early; fine late |
| Neon sign | $500 | 94 / 51 / 22 | No | No | Fail early |
| Speaker | $350 | 287 / 55 / 56 | No | No | Fail |
| Weather radio | $300 | 103 / 54 / 22 | Partly. A wrong forecast is flagged in the report. | No | Fail early |
| Juicer I | $150 | 281 / 116 / 11 | No. 1% of customers leave the line at Maple Park. | No | Fail until the Financial District |
| Register I | $200 | 864 / 315 / 21 | No, same reason | No | Fail until the Financial District |
| Umbrella | $120 | never / 804 / 142 | No. It only acts on hot or wet days with a line. | No | **Fail everywhere** |
| Cooler | $250 | never | No. Ice costs a cent a cube and leftover ice is lost anyway. | No | **Fail everywhere** |
| Fridge | $800 | never | No. A sensible player never wastes lemons. | No | **Fail everywhere** |
| Server | $60 a day | loses $46 to $64 a day | No | No | Fail |
| Mixer | $55 a day | loses $54 to $59 a day | No. Pitcher prep is a small share of serving time. | No | **Fail everywhere** |
| Promoter | $65 a day | loses $43 to $63 a day | No | No | Fail |
| Flyers | $25 | loses money at two of three locations | No | No | Fail early |
| Newspaper, Radio, TV | $120 to $1,500 | lose money with one stand | No | No | Meant for several stands. Untested there. |

Nothing in the shop tells the player what a purchase did. That is the "show the math, or a before and after" request, and it is M10.

**Is each purchase a choice?** No. The Sensible bot buys in the same order every game. This stays open until M11 to M14 give purchases situational value.

## 3. Realism

Test: each piece creates a decision with visible feedback. Otherwise it is bookkeeping.

| Piece | Decision it creates | Verdict |
|---|---|---|
| Weather and forecast | Stock, ice and price for tomorrow | Keep. The best-working system in the game. |
| Lemon spoilage (6 days) | None for a sensible player | Bookkeeping today. Revisit with storage (see `LATER.md`). |
| Ice melt | None. Ice is too cheap to plan around. | Bookkeeping today |
| Ingredient price drift (±5% a day) | None. Too small to act on. | Bookkeeping. Keep the shortage and sale events, which are large enough to act on. |
| Rent | Location choice | Keep; needs M13 to matter |
| Reputation | Quality now against standing later | Keep, but its causes are not shown |
| Competitor cart | None. The player has no response. | Needs a response (M11 or M13) |
| Health inspector | Don't hold spoiled lemons | Harmless |

## 4. Systems

| Test | Result |
|---|---|
| Every system changes an existing decision | Staff, marketing and storage upgrades change nothing a sensible player does. **Fail.** |
| Waiting is never the best move | **Fail.** Locations unlock on cash in hand, so spending on upgrades delays the next unlock. In an experiment with cheaper upgrades, the Sensible bot bought more of them and unlocked Campus Quad on day 26 where it had been day 17. 79% of days have nothing to buy or unlock. |

## 5. Against what Benjamin asked for

| He wants | Today | Where it is addressed |
|---|---|---|
| A day of about 1 minute | 3 minutes | M10 |
| Upgrades that show the math or a before and after | Text descriptions only | M10 |
| A reason not to skip the day | The day is a replay with no input | M15 |
| Setbacks, with bankruptcy possible | Actions are blocked at $0; there is no failure state | M15 |
| An endless sandbox with incentives | Ten milestones, then nothing | M12 |
| Choosing where the stand goes within an area | One fixed spot per location | M13 |
| Skill trees and point allocation | None | M14 |
| More realism about running a business | See section 3 | M11, M13 |
| Graphics and sound like a full game | Flat vector placeholders, generated audio | M16 |
| Calm and cozy, but stimulating | Calm, and not yet stimulating | M11 onward |

## 6. What was found while checking

1. **The sim can already replay a day without one purchase.** Each passer-by draws the same four random numbers whether or not they stop, so removing an upgrade leaves the arrival schedule untouched. Tested on one day with six items: the schedule was identical for all except the Radio campaign, which adds traffic. An earlier note in `UNKNOWNS.md` said this needed an engine change. That was wrong and has been corrected.
2. **`service.pitcherPrepMinutes` is never read.** Prep time comes from `upgrades.juicer.tiers[0].prepMinutes`. Changing the service value does nothing.
3. **Cheaper purchases do not fill the quiet days.** With every price in the M9 spec applied, quiet days stayed at 79%. Goals are needed for that (M12).
4. **Storage and the Mixer cannot be fixed with numbers.** They fix problems the game does not have. M9 takes them off sale until they are redesigned.

## 7. How the experiments were run

Config values were overridden in memory and the Sensible bot played one stand for 28 days over 12 seeds, the same way the audit's probes work. Nothing in the repo's config was changed. Twelve seeds is fewer than the audit's twenty, so treat the figures as starting points for tuning.

| Experiment | Result |
|---|---|
| Serving time 0.8 → 2.0 minutes | Customers leaving the line: Maple Park 1.0% → 3.4%, Campus Quad 1.1% → 6.1%, Financial District 7.2% → 18.2% |
| Pitcher prep 4 → 6 minutes through `service.json` | No change at all (finding 2) |
| The M9 price and wage table | Payback within 30 days: 3 of 6 items at Maple Park, 5 of 6 at Campus Quad, 6 of 6 at the Financial District. Server +$49 a day and Promoter +$16 a day at the Financial District. Flyers +$2 a day at Maple Park. |
| The same table through `npm run balance` logic | 8 of 10 targets pass. "Reaches $1,000 cash" slips to day 27, because the bot now spends its cash. The price-variety gap is $0.25 against a $0.30 target. |
| Quiet days and unlock timing under the same table | Quiet days 79% → 79%. Campus Quad unlock day 17 → 26. |
