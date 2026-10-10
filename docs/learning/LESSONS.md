# Lessons

What we believed, what happened, and what we do differently. Newest at the bottom.

How this file works:

- Before building a change, add a line under **Open bets** saying what we expect it to do.
- After the playtest, move the line to **Lessons** with what happened.
- A lesson confirmed twice (two playtests, or a playtest and an audit result) is promoted into `docs/research/PRINCIPLES.md` or the skill it concerns, and marked `promoted`.
- A rule contradicted twice is removed from wherever it lives, and the removal is noted here.

## Lessons

| # | Date | We believed | What happened | Do differently | Status |
|---|---|---|---|---|---|
| L1 | 2026-10-09 | Passing the GDD §17 balance targets meant the game was balanced. | All 10 targets passed. The first playtest was boring, and the audit showed lazy play earning 98% of Sensible play. The targets only measured how fast money grows. | Run `npm run audit` alongside `npm run balance`. Pacing targets and decision checks are different things. | promoted (PRINCIPLES 18, game-build-verify) |
| L2 | 2026-10-09 | Faster serving and prep upgrades help everywhere. | At Maple Park 1% of customers leave the line, so Juicer I pays back in 281 days and Register I in 864. They pay back in 11 and 21 days at the Financial District, where 7% leave. | Offer a purchase when the problem it fixes is visible to the player, and show that problem. | confirmed once (audit + playtest "little incentive to buy upgrades") |
| L3 | 2026-10-09 | A description of an upgrade's benefit is enough feedback. | "I really couldn't tell how much it was truly helping after I purchased them." | After a purchase, show what changed in the player's own results. | confirmed once (playtest) |
| L4 | 2026-10-09 | Cash thresholds make good expansion goals. | 82% of days have nothing to buy or unlock; the longest quiet stretch is a median 32 days. The player skipped days to save up. | Waiting must never be the best move. Give each day a reachable goal. | confirmed once (audit + playtest) |
| L5 | 2026-10-09 | Unlocking a new location is its own reward. | Uptown Blocks, the first unlock, earns $51 a day against Maple Park's $82. The player "didn't understand the purpose of buying multiple parts of the map". | A new location must be visibly different or better in a way shown before the player commits. | confirmed once (audit + playtest) |
| L6 | 2026-10-09 | Staff and marketing are useful mid-game investments. | Every staff role loses $43 to $64 a day at all three locations tested. Only Flyers at the Financial District earns its cost. | Price staff and marketing against the profit they can add, and check with the audit. | confirmed once (audit) |
| L7 | 2026-10-09 | Making upgrades cheaper would get the game moving. | In an experiment with cheaper upgrades the Sensible bot bought more of them and unlocked Campus Quad on day 26, where it had been day 17. Unlocks read cash in hand, so spending delays them. Benjamin's playtest said the same thing: "You have to hoard money a lot to move onto the next stage." | Progress gates count what has been earned, never cash in hand. | promoted (PRINCIPLES 24, KNOWLEDGE section 15) |
| L8 | 2026-10-09 | Cheaper purchases would fill the quiet days. | Quiet days were 79% before and 79% after. There are about ten things to buy across 160 days. | Quiet days need goals, which is M12. | confirmed once (experiment) |
| L9 | 2026-10-09 | Replaying a day without one purchase needs an engine change (Claude logged this as U8 without reading the code). | A test showed the same people arrive with and without every upgrade, staff role and Flyers. Only campaigns that add traffic change the crowd. | Read the code and run a test before logging a limitation of it. | confirmed once |
| L10 | 2026-10-10 | Making purchases pay back and showing their effect would make the game interesting. | Both shipped (M9, M10). Playtest 2: "didn't really change much day by day… got mundane really quick." Recipe never changed; 83% of days skipped. | Fixing the economy can't create decisions the core loop doesn't have. Design the daily decision first, then tune numbers. | confirmed once (playtest + play log) |
| L11 | 2026-10-10 | Showing the model's own terms (multipliers, sample-day profits) is "showing the math". | "Is it per customer or something? It didn't make much sense." Opened twice, then never. | Explain in plain cause and effect with the player's own numbers ("+14 people stopped yesterday because…"), not model parameters. | confirmed once (playtest) |
| L12 | 2026-10-10 | Generated music in Dorian and Lydian modes would sound calm. | "More ominous than relaxing." | Relaxing-upbeat means major keys, bouncy rhythm, bright timbres (ukulele, marimba, whistle). Get a reference track from Benjamin before composing. | confirmed once (playtest) |
| L13 | 2026-10-10 | Variety has to be forced, so repeating a dish should cost the player (the research's main recommendation, from Cook, Serve, Delicious!). | Benjamin rejected it on reading: "you would want the player to feel rewarded rather than make it an absolute chore to constantly innovate. Don't penalize but rather incentivize." | Reward the new thing and never punish the familiar one. Check a research recommendation against `TASTE.md` before presenting it as the plan. | confirmed once (his reaction) |
| L14 | 2026-10-10 | A game that asks for a decision every day should ask for every decision every day. | "So you don't have to constantly think about it all the time where it becomes mundane and tedious… Eventually, it should be automated." | Cap the decisions a stage asks for, and offer to hand off an old one whenever a new one arrives. | confirmed once (his reaction) |

## Open bets

| Milestone | Date | We expect | How we'll know | Result |
|---|---|---|---|---|
| M9 | 2026-10-09 | With cheaper upgrades, 2-minute serving and unlocks that count money earned, Benjamin buys upgrades as he can afford them and stops skipping days to save for an unlock. | Playtest 2: "What did you buy, and what made you pick it?" Audit version 2, checks 1 to 5. | **Mostly lost (2026-10-10).** Audit checks 1–5 pass, but in 23 days he bought one upgrade (Stall, day 16), the Weather radio, one hire and one Flyers. 83% of days had nothing bought. Purchases being worth it on paper did not make buying interesting. |
| M10 | 2026-10-09 | With a projection before buying and a same-day comparison after, Benjamin can say what his last purchase did, in numbers. | Playtest 2: "What did you expect it to do?" then "What did it do?" | **Split (2026-10-10).** The after-report worked: he fired a Promoter the report showed losing ~$13/day. The projection and "Show the math" did not: "didn't make sense… is it per customer?" Opened on days 1–2 only. |
| M10 | 2026-10-09 | A 1-minute day feels brisk and still readable. | Playtest 2: "How did the length of the day feel?" | **Untested (2026-10-10).** He skipped 83% of days by 9:22 AM; length wasn't the problem, having nothing to watch for was. |
| P1 | 2026-10-10 | With a forecast range, a street price, faces at the price tag and a report of what was missed, Benjamin changes his batch or price because of something he saw, skips under half the days, and hands the batch off by choice as a relief. | Playtest 3 questions; `npm run playlog` rework checks (P1 spec). | |
| P1 | 2026-10-10 | With a forecast range, a street price, faces at the price tag and a report that says what was missed, Benjamin changes his batch or price because of something he saw. | Playtest 3, question 1. Play log: batch or price changes on 40% or more of stand days; price inside the street range within 5 days. | |
| P1 | 2026-10-10 | Handing quantity off through a skill feels like a relief he chose, and the mornings before it do not feel like a chore. | Playtest 3, question 4. Play log: when Prep sense and Standing order were bought. | |
| P1 | 2026-10-10 | Showing a skipped day's moments as stills gives him a reason to watch some days. | Playtest 3, question 3. Play log: under half of days skipped. | |
