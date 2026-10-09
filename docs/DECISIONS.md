# Decisions log

Choices made where the GDD is ambiguous or silent. Newest at the bottom of each section.

## M1 — Scaffold
- **Validation:** hand-written guards (`src/config/guards.ts`) rather than zod, so no new runtime dependency. Unknown keys are rejected to catch typos.
- **Phaser 3.90** (the latest 3.x). Phaser 4 exists, but CLAUDE.md specifies Phaser 3.
- **Hourly weight curves (§7):** the GDD gives only the peak hours. Each archetype has 10 values for hours 9–18: 1.0 at peak hours, 0.1–0.5 elsewhere. Between hour marks the weight is linearly interpolated, and each curve is normalized to a daily mean of 1. That way a location's "traffic/hr" means the *average* number of passersby per hour.
- **Kids are weekend-heavy:** kids get a `weekendMultiplier` of 1.6 on their mix share at weekends. Shares are then renormalized, so the location's weekend traffic total doesn't change.
- **Fans** only appear on Stadium game days. On other days their share is dropped and the rest of the mix is renormalized.
- **Weather condition odds per season (§4):**
  - Spring: Sunny 30, PartlyCloudy 25, Cloudy 20, Rain 20, Storm 5
  - Summer: 55 / 25 / 10 / 8 / 2
  - Fall: 25 / 25 / 25 / 20 / 5
  - Winter: 25 / 25 / 30 / 15 / 5
- **Milestone bonuses (§16):**
  - First $100 day: $25
  - First upgrade: $25
  - Rep 75 anywhere: $50
  - Each location unlocked: $50
  - 2nd / 3rd / 4th stand: $100 / $250 / $500
  - Net worth $10k / $100k / $1M: $100 / $500 / $1,000
- **Major events (§15)** are Heatwave, Festival, Lemon shortage, Sugar sale and Construction. Each morning they are rolled in that order, and the first hit wins. Competitor carts (per location) and the Health inspector (at night) are rolled separately.
- **Stadium Row** traffic is 40 on both weekdays and weekends, and 400 on game days.
- **Umbrella** applies when the temperature is above 85°F or the condition is Rain *or Storm*.
- **Candidates** in the hiring pool have skill 1–3.
- **RNG streams:** each system (weather, prices, events, customers, staff…) draws from its own generator, seeded from `hash(seed, day, stream)`. The weather for a seed is then the same whatever the player does, which keeps bot comparisons fair.

## M2 — Simulation core
- **API:** `runDay(state, plan, config = CONFIG)` and `newGame(config, seed)`. Config is an optional last argument, so balance tooling can pass a tuned config. Player actions go through `dispatch(state, action)`, which returns a new state.
- **Day structure:** `runDay` simulates the business day, then the night (rent, wages, rep, spoilage, inspector, unlocks, milestones), then sets up the next morning (price drift, events, weather and forecast, hiring pool). The returned state is always "morning of the next day".
- **Buy decision timing (§7):** a stopper checks the line, then decides whether to buy. Only buyers join the queue, so "Too expensive" customers leave at once instead of blocking the line.
- **Expected wait:** the time until a lane frees up, plus the queue ahead divided by the total lane speed, plus pitcher prep if the current pitcher can't cover the queue ahead.
- **Waiting in line:** people already in line never give up because of the wait. A long wait only lowers satisfaction through `waitFactor`. They do leave if the stand sells out.
- **First pitcher of the day** is ready at opening if ingredients allow. After that, a new pitcher starts as soon as the current one is empty: during opening hours, or after closing if people are still in line.
- **After closing**, customers already in line are still served. No new arrivals come after 18:00.
- **Ice from a shared pool, with a per-stand Cooler:** the melt multiplier is the average over operating stands (each stand counts 0.5 with a Cooler, 1 without). Melt is applied hourly, using the temperature at mid-hour.
- **Out of ice:** if there isn't enough ice for a full serving, the cup gets no ice (effective I = 0), as §6 says.
- **Low-satisfaction bubble with no recipe complaint:** if sat < 0.4 but no §6 complaint triggered, the bubble blames whatever hurt most: "Overpriced" (fairness) or "Slow service" (wait). This follows the readable-feedback pillar.
- **No buyers:** a location with no buyers that day keeps `daySat = rep/100`, so only `lostRate` moves rep.
- **Accounting:**
  - Profit = revenue − ingredients used (at cost) − rent − wages − ads − spoilage − fines.
  - Spoilage = expired lemons + melted ice + ice left over at day end.
  - Stock bought and upgrades/licences are cash flows, not profit. The report shows them separately.
- **Net worth** = cash + inventory at cost. Upgrades and licences are not counted.
- **Location unlocks (§10)** are thresholds, not purchases. A location unlocks at night once cash ≥ X and best rep ≥ Y. Licences (§11) do cost money.
- **Wages** are paid daily for every hired staff member, whether or not their stand opened. Skill rises every 20 days the stand actually opened.
- **Health inspector:** rolled at night, before expired lemons are thrown out. If expired lemons are on hand, the fine and the −5 rep apply to every location operated that day.
- **Lemon shelf life:** a batch bought on day d can be used through day d+5 and is discarded at the end of that day ("spoils after 6 days").
- **Events:** a Festival is announced the morning before it happens. Festival and Construction pick a random *unlocked* location. Competitor carts are rolled per unlocked location. "First $100 day" means profit ≥ $100.

## M3 — Balance harness and tuning
**Bots** (`scripts/bots.ts`):
- The bots estimate demand from the forecast with the same §4/§7 formulas a practiced player would learn. They pick the most profitable price on a $0.25 grid, then refine it in $0.05 steps.
- **Recipe:** L = 6. S matches the crowd's weighted sweet shift. I = ideal ice for the forecast's mean temperature.
- **Stock:** expected buyers × 1.2. Sugar and cups are bought in bulk once cash is over $300.
- **Sensible bot's expansion rules:**
  - Throughput upgrades only when the line turned away more than 4% of stoppers.
  - Appeal upgrades when they cost ≤ 25% of cash.
  - A licence when there are more profitable free locations than stands.
  - Stands are placed at the best-earning unlocked locations each day.
  - A Server is hired when the line loses enough sales to pay their wage, and staff are let go when the line is short.
- **Greedy and Cheap** use the same logic with a fixed price. **Hoarder** buys 3× the day's needs every morning, ignoring stock on hand.

**Measurement choices:**
- The "reaches $1,000" and "unlocks FD" targets use the median over 20 seeds.
- **Variety target:** a fresh game (rep 40) at Maple Park, on Tue–Thu, forced Sunny at 60°F or 90°F. Prices are tested from $0.50 to $2.50 in $0.05 steps, over 20 seeds × 3 days. The score is revenue − ingredients used.

**Tuning changes** (config only; no formulas changed):

| Value | GDD | Now | Why |
|---|---|---|---|
| `customers.decision.stopBase` | 0.25 | 0.27 | Overall demand. Tried 0.35/0.40 first, then lowered again as WTP rose |
| `wtpBase` Kid / Office / Tourist / Jogger | 0.75 / 1.75 / 2.25 / 1.25 | 1.15 / 2.50 / 3.25 / 1.80 | |
| `wtpBase` Senior / Student / Fan | 1.00 / 1.00 / 2.50 | 1.45 / 1.45 / 3.60 | |
| `priceSens` Kid / Office / Tourist / Jogger | 1.6 / 0.8 / 0.6 / 1.0 | 1.2 / 0.6 / 0.45 / 0.75 | |
| `priceSens` Senior / Student / Fan | 1.4 / 1.3 / 0.5 | 1.05 / 0.98 / 0.38 | |

- The WTP bases were scaled about 1.45× and price sensitivity 0.75×. This was the only table-level lever that pushed the 60°F/90°F best-price gap past $0.30. Before, it was $0.20–0.25 because Maple Park's crowd (35% kids) prices low.
- It also gave the mid and late game the income they needed. Before tuning, FD unlocked around day 119 and $100k was never reached by day 260.
- A cleaner fix for the variety gap would be to make temperature matter more in the WTP formula (`wtpThirstBase`/`wtpThirstScale`, 0.6/0.4). That is a formula coefficient, so it was left alone, as the handoff asks.

**Result (20 seeds × 260 days):** all 10 targets pass. See the M3 summary in the commit and the `npm run balance` output.

## M4–M6 — Playable game (UI)
- **Instant sim, replayed day:** pressing "Open for business" runs `runDay` instantly and autosaves the resulting night. The Phaser scene then replays the event log. Closing the app mid-replay therefore can't change or re-roll the day.
- **Phaser vs DOM:** the day view is Phaser for the street only. The clock, cash, stock bars, speed controls, stand tabs and live funnel are DOM, which is easier to lay out for touch. The scene renders at 2× (camera zoom) for crisp vector art on phones.
- **Live stock bars:** each bar starts from the latest hourly snapshot in the event log, minus pitchers and servings since then. That's exact apart from melt, which the next hourly snapshot corrects.
- **Busy streets:** plain passers-by are thinned out (`passSampling`) so about 22 walkers are on screen at once. Everyone who stops is always drawn. At most 6 non-overlapping bubbles show at a time, with people at the stand taking priority.
- **Queue:** the line shows up to 12 people (§8) plus a "+N in line" label.
- **The whole UI ships with M4:** the sim already supported multiple stands, staff, marketing and events, so all six hub tabs, the map and the stats screen are included. The M5/M6 milestones are therefore UI-complete.
- **Seed:** a new game's seed comes from the clock in the UI layer. The sim never reads the time.
- **Speed:** 1× is 3 game minutes per real second (a 3-minute day, §0).

## Tooling — decision audit and skills (2026-10-09)
- **`npm run audit`** (`scripts/audit.ts`) checks what `npm run balance` does not: whether adapting beats not adapting, whether each upgrade, staff role and campaign pays for itself, and how many days pass with nothing to buy. It is tooling only; no sim code or config changed.
- **Audit thresholds** (85% lazy play, 30-day payback, 60% quiet days, 10-day quiet stretch) are our own proposals, set as constants at the top of the script. They are listed as an open question in `docs/learning/UNKNOWNS.md` (U1).
- **Probe runs** hold cash at $500 or more so stock is never cash-limited. They compare profit per day, not cash.
- **Skills** live in `.claude/skills/` (`game-research`, `game-design`, `game-build-verify`). What they learn is kept in `docs/learning/` and `docs/research/`.
