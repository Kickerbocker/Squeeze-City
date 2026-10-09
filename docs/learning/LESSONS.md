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

## Open bets

| Milestone | Date | We expect | How we'll know | Result |
|---|---|---|---|---|
| M9 | 2026-10-09 | With cheaper upgrades, 2-minute serving and unlocks that count money earned, Benjamin buys upgrades as he can afford them and stops skipping days to save for an unlock. | Playtest 2: "What did you buy, and what made you pick it?" Audit version 2, checks 1 to 5. | |
| M10 | 2026-10-09 | With a projection before buying and a same-day comparison after, Benjamin can say what his last purchase did, in numbers. | Playtest 2: "What did you expect it to do?" then "What did it do?" | |
| M10 | 2026-10-09 | A 1-minute day feels brisk and still readable. | Playtest 2: "How did the length of the day feel?" | |
