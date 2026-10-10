# P1: a plain prototype of the first three stages

Status: waiting for Benjamin to approve `docs/GDD-v2.md`. Build with the `game-build-verify` skill. If this spec and GDD-v2 disagree, GDD-v2 wins.

## Problem

- "I feel like the game didn't really change much day by day. Not much thinking or problem solving, and got mundane really quick." (Benjamin, 2026-10-10)
- Play log, Playtest 2: 83% of days skipped; 74% of mornings were restocking only; the price sat at half the best price for 23 days and nothing said so; 208 customers were turned away on a day he didn't watch.
- "Make sure it's a good balance… so you don't have to constantly think about it all the time where it becomes mundane and tedious… Eventually, it should be automated somehow through skill trees or upgrades."

## What this prototype is for

One question: **are the first three stages of the v2 design worth playing for about 20 game days?** It tests the two daily decisions, the reactions and reports that teach them, and the first hand-off. It uses the look the game has now. No new art or music.

## Feeling and behavior

**Feeling:** each morning I make a call, I watch whether it was right, and I get a little better at it. When it starts to feel routine, I can hand it off.

**Behavior:** the player reads the forecast and the street price, sets a batch size and a price, watches reactions, and changes tomorrow's plan because of what they saw.

## Scope

| In | Out (later prototypes) |
|---|---|
| Gigs, as one simple choice a day | The cart, where to set up, the special |
| Market table: how much to make | Recipes, mastery, seasons, trends |
| Drink stand: how much to make, what to charge | Vending machines |
| Faces at the price tag; the sold-out sign and counter | Staff, bills, going broke |
| The evening report with "what you missed" | New art, new music |
| The "you missed" strip on skipped days | Skill branches beyond the four nodes below |
| Four skill nodes, including the first hand-off | |
| A 7-day week with market days and one weekly goal | |

The prototype ends when the food cart unlocks, with a card saying what comes next.

## Rules

Starting numbers are in `scripts/paper-economy-v2.mjs` (`N.stand`, the first three entries of `N.rungs`, `N.xpPerLevel`). Move them into `src/config` as the build needs them.

### Stage 1: gigs (days 1 to about 3)

- Each morning offers three gigs. Each shows its pay and the one thing it teaches.
- Delivery run: $40 to $60, and it reveals what two neighborhoods' crowds like.
- Market helper: $40 to $60, and it shows a batch-size decision being made by the stall's owner, with the result.
- Lemonade for a neighbor's yard sale: $40 to $60, and it shows faces reacting to a price.
- A gig day takes about 20 seconds to watch.
- Gigs stay available on any later day in place of running the business.

### Stage 2: market table (unlocks at $120 earned, costs $90)

- One product, baked at home. The player's only decision is how many to make.
- The morning board shows a forecast range of buyers, for example "55 to 85 people likely to buy". The range is wider on days the forecast is less sure.
- Unsold goods keep half their value for tomorrow.
- Saturday and Sunday are market days with about twice the crowd. On weekdays the table sets up at a small corner spot.

### Stage 3: drink stand (unlocks at $420 earned, costs $300)

- Adds the price decision. The product is lemonade.
- The morning board shows the street price as a range for today's weather, for example "$1.00 to $1.50 on a warm day".
- Each customer shows one of four reactions at the price tag: "What a deal!" (they would have paid much more), a smile (about right), "Hmm, pricey" (bought, reluctantly), or walking off.
- What customers will pay moves with the weather: about $1.00 in rain up to about $1.50 on a hot day.

### The day

- One minute at 1×, with 2×, 4× and Skip, as now.
- Three moments are slowed and labelled as they happen. Candidates: the first "What a deal!" run of five customers; the SOLD OUT sign going up; the first run of three people walking off at the price; the day's biggest queue.
- The SOLD OUT sign shows the time it went up and counts the people who leave after it.

### The evening report

Three parts, in this order, each in the player's own numbers:

1. **What you earned.** Sold, made, left over, profit.
2. **What you missed.** At most two lines, largest first:
   - "You sold out at 1:40 pm. 62 people left. Making 60 more would have earned about $55."
   - "You charged $0.55. 48 of 60 customers thought it was a steal. At $1.20 you would have earned about $31 more."
   - "You made 40 too many. They keep half their value for tomorrow."
3. **One suggestion for tomorrow**, phrased as something to try.

Compute "would have earned" by replaying the same day with the one change, as `attributeDay` does today.

If the day was skipped, the three moments appear as stills at the top of the report.

### Skills

Money earned gives experience, and each level gives one point. Four nodes:

| Node | Costs | Does |
|---|---|---|
| Sharp eye | 1 point | Reactions show a number: "would have paid about $1.40" |
| Thrifty | 1 point | Unsold goods keep 75% of their value |
| Prep sense | 2 points; needs 5 days of setting the batch by hand | Quantity becomes Helped: the board suggests a batch, one tap accepts |
| Standing order | 2 points; needs Prep sense | Quantity becomes Handed off: it sets itself each morning. Can be taken back any day. |

A handed-off quantity makes the middle of the forecast with nothing extra for a busy day.

### The week

- Bills are not in this prototype.
- One weekly goal, shown on Monday: for example "Sell 400 cups this week" or "Beat your best Saturday".
- A one-screen week summary on Sunday night.

## What the player sees

**Morning board, drink stand**

```
Tuesday · Warm, 81° · forecast is fairly sure
180 to 260 people likely to want a drink
Lemonade on this street: $1.00 to $1.50 today

How many to make        [ 220 ]   −  +
Price                   [ $1.20 ] −  +

This week: sell 900 cups (412 so far)
                         [ Open the stand ]
```

**With Prep sense**

```
How many to make        [ 215 ]  suggested   [Use it]
```

All of it has to work at 390 px wide with touch targets of 44 px or more.

## Play log additions

Record per day: the forecast range and the batch chosen; the street price range and the price chosen; counts of each reaction; whether each labelled moment was on screen at 1× or 2×; whether the "you missed" lines were scrolled into view; which decisions were Yours, Helped or Handed off; skill points spent and on what; gig days taken after the stand unlocked.

## Checks before the playtest

**Bots**

- A bot that never changes batch or price earns at most 85% of a careful bot at the stand.
- A handed-off quantity earns 85% to 96% of a careful bot's.
- A bot charging $0.55 earns under half of a careful bot's.
- The careful bot reaches the stand between day 5 and day 9, and the cart unlock between day 14 and day 22.

**Tests**

- "Would have earned" figures come from replaying the same day and are exact.
- Reactions match the price and what that customer would have paid.
- A handed-off decision can be taken back and handed off again without changing the day's outcome for the same inputs.

## Done when

- `npm test`, `npm run balance` and `npm run audit` pass or fail as they did before this work. The v1 game still plays.
- The bot checks above pass, added to `npm run audit` as a v2 section.
- `npm run paper` still passes with whatever numbers the build ended on.
- The prototype is reachable from the title screen as its own mode, with its own save slot.

## Playtest 3

Play to the food cart unlock, about 20 game days. Export the play log. Then answer:

1. Tell me about a morning where you changed your plan. What did you see that made you change it?
2. What did the faces tell you?
3. Was there a day you were glad you watched? A day you skipped and wished you hadn't?
4. When did setting the batch start to feel routine, if it did? What did you do then?
5. How did the report's "what you missed" lines read to you?

**Rework the design if any of these happen:**

1. He can't describe one decision he made and what came of it.
2. The price never moves into the street price range within 5 days of the stand opening.
3. More than 70% of the first 15 days are skipped.
4. The median morning takes under 10 seconds on more than 60% of days, before anything is handed off.
5. He describes the mornings as a chore before Prep sense is within reach.

**It worked if:** the batch or price changes on at least 40% of stand days, under half of days are skipped, and he hands quantity off by choice and says it was a relief.

## Cut from this prototype

| Left out | Why | Where it goes |
|---|---|---|
| Recipes, mastery, the special | They matter from the cart on | P2 |
| Where to set up | Needs neighborhoods | P2 |
| Vending machines | A side earner needs a main business that is already interesting | P2 |
| Bills and going broke | Nothing to lose yet at these stages | P4 |
| New art and music | The days have to be worth playing first | P3 |
