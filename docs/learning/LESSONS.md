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

## Open bets

None yet. The first one is written with the first spec.
