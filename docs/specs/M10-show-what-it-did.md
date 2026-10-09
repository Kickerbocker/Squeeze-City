# M10: Show what it did

Status: ready to build after M9. Build with the `game-build-verify` skill. The GDD (v1.1, §21) carries the same rules and is the source of truth if the two ever differ.

## Problem

- "Although the upgrades, hiring, and marketing gave some description on the benefits, I really couldn't tell how much it was truly helping after I purchased them." (Benjamin, 2026-10-09)
- "Perhaps show the math, or at least show a comparison of before the upgrade and after."
- "Let's do 1 min" (the length of a day).
- Today an upgrade card reads "Appeal ×1.15 — more people stop". It gives no baseline and nothing afterwards.

## Feeling and behavior

**Feeling:** I know what that purchase did, in my own numbers, and I trust the game to tell me when something was a waste.

**Behavior:** before buying, the player reads what the item should do here and how long it takes to pay back. After buying, they glance at the evening report to see whether it did.

## Rules

### A. Before buying: three lines on every purchase card

1. **Projection.** "About +$7 a day here (typically +$4 to +$10)."
2. **Payback.** "Pays for itself in about 17 days." For staff and campaigns, which cost money every day: "About +$16 a day after wages."
3. **Why.** The visible problem it fixes, in yesterday's numbers.

If the projected gain is under $0.50 a day, the first two lines are replaced by "Won't help much here yet", and the third line says why.

A **Show the math** control opens the inputs behind the projection. It is closed by default. A setting, "Always show the math", keeps it open.

**How the projection is computed.** A new pure function in `src/sim`, `projectPurchase(state, action, cfg)`:

- Simulate tomorrow twice, with and without the item, and take the difference in profit.
- Tomorrow uses the forecast as its weather, each stand's current recipe and price, and enough stock that nothing sells out.
- Repeat over 7 sample days. Seed them from a new `projection` RNG stream, so the projection can never reveal tomorrow's real customers.
- Report the median and the 2nd and 6th of the 7 sorted results as the typical range.
- For an upgrade that applies to one stand, project for the selected stand at its current location.

**The "why" line by item**

| Item | Line |
|---|---|
| Stall, Kiosk, Shop, Neon sign, Speaker, Promoter, Flyers | "Yesterday 298 people walked past and 47 stopped." |
| Juicer, Register, Server | "Yesterday 31 people (14%) left your line." When nobody left: "Nobody left your line yesterday, so this won't help here yet." |
| Weather radio | "The forecast was wrong on 2 of the last 10 days." |
| Newspaper, Radio, TV | "You have 2 stands open. This reaches all of them." |

**Show the math** lists the values the item changes, old to new, from config: "Serving time 2.0 → 1.6 minutes", "Chance a passer-by stops ×1.00 → ×1.15".

### B. After buying: "What your purchases did today" in the evening report

For each item the list covers, the game replays today without that one item and shows the difference.

- "Neon sign: 5 more people stopped. +$5.30 today. $31 of $90 earned back."
- "Sam, Server: 14 fewer people left the line. +$22 today after his $16 wage."
- "Flyers: 4 more people stopped. −$2.80 today after cost. Rain kept people home."

**What the list covers:** every upgrade not yet paid off, every staff member, and every active campaign. Paid-off upgrades leave the list. Show at most 6 lines per stand, largest effect first.

**How the comparison is computed.** A new pure function in `src/sim`, `attributeDay(morningState, plan, cfg)`:

- For each covered item, run `runDay` again from the same morning state and plan with that one item removed. Remove an upgrade by dropping one tier, a staff member by taking them and their wage out, a campaign by deleting it.
- The difference in profit is the item's effect today. Also report the difference in the count that item acts on: people who stopped, or people who left the line.
- This is exact. The sim draws the same random numbers for every passer-by whether or not they stop, so the same people arrive in both runs. A unit test must hold this in place.

**Two exceptions**

- **Radio and TV campaigns** add foot traffic, which changes who arrives. Show their figure as a 7-day average with the word "about".
- **Weather radio** changes the forecast, which changes what the player plans. A replay cannot measure that. Its line reads "Forecast right 9 of the last 10 days."

**Losses are reported as plainly as gains.** When weather explains a bad day, say so: add "Rain kept people home" when the condition was rain or storm.

### C. Purchase ledger

- New state: `purchases`, a list of `{ item, standId, day, cost, earnedBack }`.
- Each night, add the day's effect to `earnedBack` for upgrades that are not yet paid off.
- When `earnedBack` reaches `cost`, the Upgrades tab shows "Paid off in 14 days ✓" on that item. Until then it shows a progress bar.
- A new entry point, `runDayWithAttribution(state, plan, cfg)`, calls `runDay`, then `attributeDay`, updates the ledger and returns both results. The app calls this one. Bots keep calling `runDay`, so balance runs are no slower.

### D. A one-minute day

- At 1× the day takes 60 seconds (was 180). Speeds are 1×, 2×, 4× and Skip.
- In `src/game/DayScene.ts`, `MINUTES_PER_SECOND` goes from 3 to 9.
- Check that customers, the line and thought bubbles still read at that pace. Walk speed and how long a bubble stays up will need adjusting.

## Numbers

| Value | Setting | Lives in |
|---|---|---|
| Sample days per projection | 7 | `src/config/feedback.json` (new) |
| Typical range | 2nd and 6th of 7 sorted results | same |
| "Won't help here yet" below | $0.50 a day | same |
| Rounding of projected gains | nearest $1 under $20, nearest $5 above | same |
| Lines per stand in the report | 6 | same |
| Averaging window for Radio and TV | 7 days | same |
| Days of forecast history for the Weather radio line | 10 | same |
| Day length at 1× | 60 seconds | `MINUTES_PER_SECOND` = 9 in `DayScene.ts` |

Projections are rounded because they are estimates. The evening report shows exact cents because it is a measurement.

## What the player sees

**Upgrade card, before**

```
🏪 Stall                                  $120
About +$7 a day here (typically +$4 to +$10)
Pays for itself in about 17 days
Yesterday 298 people walked past and 47 stopped.
[Show the math]                          [Buy]
```

**Upgrade card, when it would not help**

```
🧾 Register I                             $120
Won't help much here yet
Nobody left your line yesterday.
[Show the math]                          [Buy]
```

**Evening report, new card under "Money"**

```
What your purchases did today
Stall        6 more people stopped      +$7.10
             $43 of $120 earned back   ▓▓▓░░░░░
Flyers       4 more people stopped      −$2.80 after cost
             Rain kept people home.
```

**Upgrades tab, after payback:** "Stall: paid off in 17 days ✓"

All of it has to work at 390 px wide with touch targets of 44 px or more.

## Save format

The state gains `purchases`, and a short forecast history for the Weather radio line. Bump the save version and add a migration:

- Each upgrade already owned gets a ledger entry with its current config cost, `earnedBack` 0 and today as its day.
- Forecast history starts empty.

## Tests

- **Zero for nothing:** an item with no effect on the day shows a difference of exactly $0.00. Use the Umbrella on a cool, dry day.
- **Same crowd:** for every upgrade and staff role, the arrival events of the two runs are identical.
- **No peeking:** `projectPurchase` returns the same result whatever tomorrow's real weather turns out to be.
- **Repeatable:** `projectPurchase` returns the same result when called twice on the same state.
- **Ledger:** `earnedBack` rises by the day's effect and the paid-off mark appears at the right time.
- **Migration:** a save from before M10 loads with ledger entries for what it owns.
- **Unchanged outcomes:** for the same seed and plan, `runDay` returns exactly what it did after M9. Nothing in M10 changes how a day plays out.

**Audit, one new check:** for Stall, Neon sign and Register I at Maple Park and the Financial District, the projection's median is within 25% of the average measured effect over 28 days.

## Done when

- `npm test` passes, including the seven tests above.
- `npm run balance` and `npm run audit` give the same results as at the end of M9, plus the new projection check.
- On a mid-range phone, the evening report appears within 1 second of the day ending with four stands open.
- The bet in `docs/learning/LESSONS.md` ("Open bets", M10) has its result filled in after Playtest 2.

**Playtest questions** (Playtest 2):

1. "Think of the last thing you bought. What did you expect it to do?"
2. "What did it do?"
3. "Did you open the math? What were you looking for?"
4. "How did the length of the day feel?"

## Cut from this milestone

| Left out | Why | Where it goes |
|---|---|---|
| Exact figures for Radio and TV | Needs arrivals drawn in a way a traffic change cannot disturb | `LATER.md`; natural to do with M15's stepped sim |
| A profit chart with purchase markers | One more thing on a small screen; see whether the ledger is enough first | `LATER.md` |
| An advisor line that names what is holding the stand back | Wants the customer and map work first | M13 |
| Customers tagged "came because of the flyer" in the street scene | Art work; the count in the report carries the information | M16 |
| Mid-day decisions | Needs the stepped sim | M15 |
