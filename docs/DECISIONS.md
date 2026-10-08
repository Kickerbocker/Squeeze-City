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
