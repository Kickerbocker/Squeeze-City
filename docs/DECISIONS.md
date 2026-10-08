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
