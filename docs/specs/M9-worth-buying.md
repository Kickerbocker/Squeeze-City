# M9: Worth buying

Status: ready to build. Build with the `game-build-verify` skill. The GDD (v1.1) carries the same numbers and is the source of truth if the two ever differ.

## Problem

- "There's little incentive to buy any upgrades or staff." (Benjamin, 2026-10-09)
- "You have to hoard money a lot to move onto the next stage which required just skipping a lot of days."
- Audit: no upgrade pays for itself within 30 days at Maple Park. Three never do. Every staff role loses money. Every campaign loses money at the first two locations.
- Experiment: locations unlock on cash in hand, so buying upgrades pushes the next unlock back. With cheaper upgrades the Sensible bot unlocked Campus Quad on day 26 where it had been day 17.

## Feeling and behavior

**Feeling:** every dollar I put into the stand comes back, and spending never sets me back.

**Behavior:** the player looks at what is holding the stand back, buys the thing that fixes it, and expects the money back within a few weeks. They never sit on cash to cross a threshold.

## Rules

1. **Serving a customer takes 2 minutes** (was 0.8). Lines now form at busy places and busy hours, so speed upgrades and Servers have a problem to fix.
2. **Upgrades cost less**, sized so each pays back in about two to four weeks at the location where it starts to matter.
3. **Staff cost less**, and the Promoter does more.
4. **Flyers are cheaper and stronger.** The other three campaigns are unchanged. They are meant for several stands.
5. **Four items come off sale** because they fix problems the game does not have: Cooler, Umbrella, Fridge and the Mixer role. A player who already owns one keeps it and it keeps working. Their redesign is in `docs/LATER.md`.
6. **Locations unlock on money earned, with no cash requirement.** The cash threshold is replaced by lifetime revenue (`stats.lifetimeRevenue`). The reputation requirement stays. Stand licences are still bought with cash.
7. **Housekeeping:** `service.pitcherPrepMinutes` is never read. Remove it from the config and schema, and note it in `DECISIONS.md`.

No formula changes. Rules 1 to 4 are config values. Rule 5 is a filter on what the shop and the hiring pool offer. Rule 6 changes which number the unlock check reads.

## Numbers

Starting values, measured over 12 seeds by 28 days with the Sensible bot (see `docs/DESIGN_REVIEW.md`, section 7). Tune config from here until "Done when" passes, and log each change in `DECISIONS.md`.

**`src/config/service.json`**

| Key | Was | Now |
|---|---|---|
| `serveMinutes` | 0.8 | 2.0 |
| `pitcherPrepMinutes` | 4 | removed |

**`src/config/upgrades.json`**

| Item | Was | Now |
|---|---|---|
| Stall / Kiosk / Shop | $400 / $2,000 / $10,000 | $120 / $600 / $2,500 |
| Juicer I / II / III | $150 / $600 / $2,000 | $90 / $300 / $900 |
| Register I / II | $200 / $900 | $120 / $400 |
| Neon sign | $500 | $90 |
| Speaker | $350 | $70 |
| Weather radio | $300 | $60 |
| Cooler, Umbrella, Fridge | $250, $120, $800 | not for sale |

Add a `forSale` flag to the three parked upgrades (false), so the list of what is sold lives in config.

**`src/config/staff.json`**

| Role | Wage was | Wage now | Effect |
|---|---|---|---|
| Server | $40 + $10 per skill | $8 + $4 per skill | unchanged |
| Promoter | $45 + $10 per skill | $8 + $4 per skill | stop chance ×(1.15 + 0.05 per skill), was ×(1.05 + 0.03 per skill) |
| Mixer | $35 + $10 per skill | not offered | unchanged for any already hired |

Add a `forHire` flag per role (Mixer false). The hiring pool only rolls roles that are for hire.

**`src/config/marketing.json`**

| Campaign | Was | Now |
|---|---|---|
| Flyers | $25, +8% | $18, +25% |

**`src/config/locations.json`**: replace `unlockCash` with `unlockRevenue`.

| Location | `unlockCash` was | `unlockRevenue` now | `unlockRep` |
|---|---|---|---|
| Uptown Blocks | $300 | $300 | 40 |
| Campus Quad | $1,000 | $1,000 | 45 |
| Boardwalk | $2,500 | $5,000 | 50 |
| Financial District | $6,000 | $17,500 | 55 |
| Stadium Row | $12,000 | $37,500 | 60 |
| Neon Square | $30,000 | $80,000 | 70 |

The revenue values are the Sensible bot's median lifetime revenue on the day each location unlocks today, rounded. A sensible player's pace is unchanged, and spending on upgrades now brings unlocks forward.

**What these numbers measured**

| | Maple Park | Campus Quad | Financial District |
|---|---|---|---|
| Customers leaving the line | 3.4% | 6.1% | 18.2% |
| Payback: Stall | 17 days | 12 | 6 |
| Payback: Neon sign | 18 | 12 | 7 |
| Payback: Weather radio | 26 | 16 | 6 |
| Payback: Speaker | 81 | 15 | 18 |
| Payback: Register I | 86 | 25 | 5 |
| Payback: Juicer I | 189 | 61 | 14 |
| Server (skill 2), net per day | −$14 | −$7 | +$49 |
| Promoter (skill 2), net per day | −$5 | −$1 | +$16 |
| Flyers, net per day | +$2 | +$5 | +$16 |

Speed upgrades and staff are for busy locations. That is intended, and M10 will tell the player so on the purchase card.

## What the player sees

M9 changes little on screen. M10 is the feedback milestone.

- **Map tab:** each locked location shows progress on money earned: "Earned $640 of $1,000" and the reputation needed. Remove any text about cash in hand.
- **Upgrades tab:** Cooler, Umbrella and Fridge are not listed unless owned. Owned ones show as "Owned".
- **Staff tab:** no Mixers in the hiring pool.
- **Day view:** lines are visibly longer at busy hours. No code change is expected; check that the queue and the "+N in line" label still read well at Campus Quad and the Financial District.

## Save format

The state shape does not change. `unlockRevenue` is config, and `stats.lifetimeRevenue` already exists. Existing saves load as they are. A location already unlocked stays unlocked.

## Tests and tooling

**Unit tests**

- The unlock check reads lifetime revenue and reputation, and ignores cash.
- The shop and the hiring pool offer only items and roles that are for sale or for hire.
- An owned parked upgrade still has its effect.

**Bots (`scripts/bots.ts`)**

- Add a **Skimper** bot that buys half the stock it expects to need. It tests whether under-buying is punished.
- Add a **Never-buys** bot: Sensible play that never buys an upgrade, hires or advertises.
- Leave the Sensible bot's rules alone.

**Audit (`scripts/audit.ts`), version 2**

Replace the purchase checks with these. The thresholds stay at the top of the script.

1. At Maple Park, at least 3 items for sale pay back within 30 days.
2. Every item for sale pays back within 30 days at one or more of the first five locations.
3. At the Financial District, at least one staff role earns its wage.
4. At Maple Park, Flyers earn their cost.
5. The Never-buys bot does not unlock Campus Quad sooner than the Sensible bot.

Also report, without requiring a pass: how much less the Skimper bot earns than the Sensible bot over 28 days. If the gap is under 10%, under-buying is not punished and the stock decision needs design work; log it in `docs/learning/UNKNOWNS.md`.

Keep the existing lazy-play and quiet-days checks. They are expected to keep failing until M11 and M12; report them as failing.

**Balance (`scripts/balance.ts`, GDD §17)**

- Replace "reaches $1,000 cash between day 14 and 25" with "unlocks Campus Quad between day 14 and 25". Cash in hand stops being a fair measure once the bot spends it.
- The other nine targets stand. In the experiment the price-variety gap was $0.25 against the $0.30 target, so expect to tune for it.

## Done when

- `npm test` passes.
- `npm run audit`: checks 1 to 5 above pass, and the Skimper gap is reported.
- `npm run balance`: all ten targets pass, with the one replaced as above.
- `docs/DECISIONS.md` lists every value that ended up different from this spec, with the reason.
- The bet in `docs/learning/LESSONS.md` ("Open bets", M9) has its result filled in after Playtest 2.

**Playtest question** (asked after M10, in Playtest 2): "What did you buy, and what made you pick it?"

## Cut from this milestone

| Left out | Why | Where it goes |
|---|---|---|
| Showing what a purchase did | Its own milestone, and it needs purchases to be worth something first | M10 |
| Filling the quiet days | Cheaper purchases do not do it: 79% before and after in the experiment | M12 |
| Redesigning storage and the Mixer | They need a problem to fix, which is design work | `LATER.md`, then M14 |
| Making Newspaper, Radio and TV pay | They are for several stands; untested there | Audit them at M13 |
| Stand licence prices | $2,000 for the second stand pays back in about 12 days at Campus Quad. Left alone. | Revisit after Playtest 2 |
