# Squeeze City — Game Design Document (v1)

Working title. Personal, non-commercial spiritual successor to Lemonade Tycoon 2. Captures the idea, not a copy: all names, art, and audio are original.

## 0. Assumptions (change here if you disagree)
- Platform: browser, mobile-first portrait (reference 390×844), installable PWA. Also works on desktop.
- Sandbox with milestones, not scripted scenarios.
- Multiple simultaneous stands (up to 4) in the late game — the "empire" fantasy.
- One drink (lemonade) in v1. Extra drinks are in the parking lot (§20).
- A business day takes about 3 real minutes at 1x speed, with 2x, 4x, and Skip.

## 1. Design pillars
1. **Every day is a small puzzle:** read the forecast, set stock, recipe, and price, watch, learn.
2. **Readable feedback:** customers show *why* they didn't buy or weren't happy (thought bubbles plus the report).
3. **Expansion fantasy:** one cart in a park becomes stands across the city.
4. **Short sessions:** one in-game day is a complete loop.

## 2. Core loop
Morning planning → Business day (simulated and animated) → Evening report → Night actions (upgrades, hiring, expansion) → next day. Autosave each night.

## 3. Calendar and time
- A year has 4 seasons of 28 days each (112 days). Start: Spring, Day 1, Year 1, a Monday.
- Season base temperature: Spring 68°F, Summer 86°F, Fall 64°F, Winter 42°F.
- Business hours are 9:00–18:00 (540 game minutes). 1 tick = 1 game minute.
- Weekend traffic uses each location's weekend value (§10).

## 4. Weather
- Daily temperature: `dayTemp = seasonBase + Normal(0, 7)`.
- Hourly curve: `temp(h) = dayTemp − 4 + 8·sin(π·(h − 9)/9)` for h ∈ [9, 18], peaking around 13:30.
- Condition, drawn from a per-season table: Sunny, PartlyCloudy, Cloudy, Rain, Storm. Summer leans sunny; Spring and Fall lean cloudy or rainy.

| Condition | W_traffic | W_thirst |
|---|---|---|
| Sunny | 1.00 | 1.00 |
| PartlyCloudy | 1.00 | 0.90 |
| Cloudy | 0.90 | 0.80 |
| Rain | 0.50 | 0.60 |
| Storm | 0.20 | 0.40 |

- Temperature thirst: `T_thirst = clamp(0.4 + (temp − 50)/40, 0.2, 1.8)`.
- Forecast: condition correct 80% of the time; the shown temperature is the true value plus Normal(0, 4). The Weather Radio upgrade raises this to 95% and Normal(0, 1).

## 5. Ingredients and inventory
| Item | Unit | Base price | Spoils | Pack sizes (discount) |
|---|---|---|---|---|
| Lemons | each | $0.30 | after 6 days (12 with Fridge) | 12 / 48 (−10%) / 144 (−20%) |
| Sugar | cup | $0.15 | never | 10 / 40 (−10%) / 120 (−20%) |
| Ice | cube | $0.01 | melts (see below) | 100 / 500 (−10%) / 1000 (−20%) |
| Cups | each | $0.04 | never | 50 / 250 (−10%) / 1000 (−20%) |

- Prices drift each day by a multiplicative random walk of ±5%, bounded to [0.75, 1.35] × base. Events can override this (§15).
- Lemons are tracked in purchase-day batches and used oldest first. Spoiled batches are discarded at night and counted as a spoilage cost.
- Ice melts `(3 + max(0, temp − 70)/10)` % per hour of the remaining stock, halved by the Cooler. All ice left at day end is lost.
- Stock is a shared warehouse pool across all stands.

## 6. Recipe and quality
- Per pitcher (12 cups): lemons L ∈ [1, 12], sugar S ∈ [1, 12]. Per cup: ice I ∈ [0, 8].
- Ideal recipe: L* = 6, S* = 4 + the archetype's sweet shift (§7).
- Taste:
  - `sourDiff = (L − L*)/4`
  - `sweetDiff = (S − S*)/3`
  - `taste = exp(−(sourDiff² + sweetDiff²))`
- Ideal ice: `I* = clamp(round((temp − 45)/8), 0, 8)`. If ice runs out, effective I = 0.
  - `iceScore = exp(−((I − I*)/2.5)²)`
- Quality: `Q = 0.7·taste + 0.3·iceScore`, in [0, 1].
- The Recipe screen shows the live cost per cup and the expected margin at the current price.

| Complaint bubble | Trigger |
|---|---|
| "Too sour" | sourDiff > 0.5 |
| "Too weak" | sourDiff < −0.5 |
| "Too sweet" | sweetDiff > 0.6 |
| "Not sweet enough" | sweetDiff < −0.6 |
| "Not cold enough" | I < I* − 2 |
| "Too much ice" | I > I* + 3 |

## 7. Customer archetypes
| Archetype | WTP base | priceSens | qualitySens | Patience (min) | Sweet shift | Peak hours |
|---|---|---|---|---|---|---|
| Kid | $0.75 | 1.6 | 0.6 | 4 | +2 | 11–16 (weekends heavy) |
| Office worker | $1.75 | 0.8 | 1.0 | 3 | 0 | 12–14, 17 |
| Tourist | $2.25 | 0.6 | 0.8 | 8 | +1 | 10–17 |
| Jogger | $1.25 | 1.0 | 1.2 | 2 | −1 | 9–11, 16–18 |
| Senior | $1.00 | 1.4 | 1.3 | 10 | 0 | 9–14 |
| Student | $1.00 | 1.3 | 0.9 | 6 | +1 | 12–18 |
| Fan | $2.50 | 0.5 | 0.6 | 5 | +1 | game days only |

Each archetype has a 10-value hourly weight curve (hours 9–18) that peaks at the listed hours. Values go in config.

### Customer decision (per passerby)
1. **Stops?**
   - `P_stop = min(0.95, 0.25 · appeal · repFactor · adFactor · W_thirst · T_thirst)`
   - `repFactor = 0.5 + rep/100`; `appeal` comes from upgrades (§12); `adFactor` from marketing (§14).
2. **Joins the line?** If the expected wait is longer than their patience (with the Umbrella bonus if applicable), they leave with "Line too long" and count as a lost customer.
3. **Willingness to pay:**
   - `WTP = base · (0.6 + 0.4·T_thirst) · (0.75 + 0.5·rep/100) · LogNormal(σ = 0.25)`
4. **Buys?**
   - `P_buy = 1 / (1 + exp(priceSens · 6 · (price/WTP − 1)))`
   - If they don't buy, they show "Too expensive."
5. **Satisfaction after drinking:**
   - `sat = Q^qualitySens · fairness · waitFactor`
   - `fairness = clamp(WTP/price, 0.5, 1.2) / 1.2`
   - `waitFactor = 1 − 0.5·min(1, wait/patience)`
   - Bubble: sat > 0.8 → "Delicious!"; sat < 0.4 → the most relevant complaint (§6); otherwise none or neutral.
6. **Sold out** (no cups, or no pitcher and no lemons or sugar to make one): "Sold out," a lost customer.

## 8. Service
- Pitcher prep: 4 minutes base. The Juicer and a Mixer reduce it. One pitcher can be prepared at a time per stand.
- Serving: 0.8 minutes per customer base. Each Register tier multiplies this by 0.8. A Server adds a parallel serving lane.
- The scene shows a visible queue of up to 12 people.

## 9. Reputation
- Each location has its own rep in [0, 100]. The first location starts at 40.
- At day end:
  - `daySat` = mean satisfaction of buyers
  - `lostRate = (lostQueue + lostSoldOut) / max(1, stoppers)`
  - `rep ← clamp(rep + 0.2·(100·daySat − rep) − 10·lostRate, 0, 100)`
- A newly opened location starts at `0.5 × mean rep of owned locations` (brand carryover).
- A location with no stand placed that day loses 1 rep per day.

## 10. Locations
| # | Location | Rent/day | Traffic/hr (wkday/wkend) | Archetype mix | Unlock (cash + best rep) |
|---|---|---|---|---|---|
| 1 | Maple Park | $0 | 40 / 70 | Kid 35, Jogger 25, Senior 25, Office 15 | start |
| 2 | Uptown Blocks | $15 | 50 / 60 | Senior 30, Kid 30, Office 20, Jogger 20 | $300, 40 |
| 3 | Campus Quad | $35 | 90 / 40 | Student 70, Jogger 15, Office 15 | $1,000, 45 |
| 4 | Boardwalk | $60 | 60 / 150 | Tourist 45, Kid 25, Jogger 30 | $2,500, 50 |
| 5 | Financial District | $120 | 180 / 40 | Office 85, Tourist 15 | $6,000, 55 |
| 6 | Stadium Row | $150 | 40 (400 on game days) | Fan 70, Student 15, Kid 15 | $12,000, 60 |
| 7 | Neon Square | $350 | 250 / 300 | Tourist 60, Office 20, Student 10, Kid 10 | $30,000, 70 |

- Boardwalk: weather multipliers are amplified ×1.5, and traffic is ×0.3 in Fall and Winter.
- Stadium Row: 2 random game days per week, announced on the map 2 days ahead.
- Hourly arrivals at a location = traffic × W_traffic × the archetype's hourly weight × (event and marketing traffic multipliers), drawn as a Poisson process.

## 11. Stands and multi-location
- The game starts with 1 stand license. More licenses: 2nd $2,000, 3rd $8,000, 4th $25,000.
- Each night, the player assigns each stand to an unlocked location (one stand per location).
- Each stand has its own recipe, price, upgrades, and staff. Inventory is shared (§5).
- Day view: tabs switch between stands. All stands simulate together.

## 12. Upgrades
| Upgrade | Scope | Tiers and cost | Effect |
|---|---|---|---|
| Stand body | stand | Cart → Stall $400 → Kiosk $2,000 → Shop $10,000 | appeal 1.00 / 1.15 / 1.35 / 1.60 |
| Juicer | stand | $150 / $600 / $2,000 | pitcher prep 4 → 3 → 2 → 1 min |
| Register | stand | $200 / $900 | serve time ×0.8 per tier |
| Cooler | stand | $250 | ice melt ×0.5 |
| Umbrella | stand | $120 | patience +30% when temp > 85°F or Rain |
| Neon sign | stand | $500 | appeal +0.10 |
| Speaker | stand | $350 | Kid, Student, and Tourist P_stop ×1.10 |
| Fridge | global | $800 | lemons spoil after 12 days |
| Weather radio | global | $300 | forecast 95% / ±1°F |

## 13. Staff (max 2 per stand)
| Role | Daily wage | Effect (skill s = 1–5) |
|---|---|---|
| Server | $40 + $10·s | parallel serving lane at speed 0.7 + 0.1·s |
| Mixer | $35 + $10·s | pitcher prep −(0.3 + 0.1·s) min, floor 0.5 |
| Promoter | $45 + $10·s | P_stop ×(1.05 + 0.03·s) |

- The hiring pool shows 3 candidates and refreshes weekly.
- Skill rises by 1 every 20 days worked (cap 5), and the wage rises to match.
- Firing has no cost.

## 14. Marketing
| Campaign | Cost | Duration | Effect |
|---|---|---|---|
| Flyers | $25 | 3 days | one location, adFactor +8% |
| Newspaper | $120 | 5 days | all stands +12% |
| Radio | $400 | 7 days | all stands +18%, traffic +5% |
| TV | $1,500 | 10 days | all stands +30%, traffic +12% |

- Each campaign's effect decays linearly to 0 over its duration.
- Overlapping campaigns multiply together, with adFactor capped at 1.6.

## 15. Random events
Rolled each morning; at most 1 new major event per day.

| Event | Chance | Effect |
|---|---|---|
| Heatwave | 8% in Summer | +12°F for 2–4 days |
| Festival | 3% | one location traffic ×2.5 for 1 day, announced 1 day ahead |
| Lemon shortage | 4% | lemon price ×1.6 for 3–5 days |
| Sugar sale | 4% | sugar price ×0.6 for 2 days |
| Construction | 3% | one location traffic ×0.5 for 5–10 days |
| Competitor cart | 5% per location | steals 20% of stoppers (5% if rep > 70) for 7 days |
| Health inspector | 2% | if spoiled lemons were held that night: $200 fine and rep −5 |

## 16. Progression
- Starting cash: $100, with no inventory.
- Milestones (toast notification plus a small cash bonus):
  - First $100 day
  - First upgrade
  - Rep 75 anywhere
  - Each location unlocked
  - 2nd, 3rd, and 4th stand opened
  - Net worth of $10k, $100k, and $1M. Reaching $1M earns the "Tycoon" title.
- Stats screen: lifetime cups sold, best day, a net-worth chart, and the most common complaints.

## 17. Balance acceptance targets
Run headlessly over 20 seeds with `npm run balance`.

**Sensible bot** (good recipe for the weather, cost-aware price, buys stock for the forecast):
- Days 1–7: average profit $15–$60 per day
- Reaches $1,000 cash between day 14 and 25
- Unlocks the Financial District between day 45 and 70
- Reaches $100k net worth between day 160 and 260
- Cash never goes below $0
- On rain days, average profit is at least −$20

**Strategy-check bots:**
- Greedy bot (price always $3.00): at least 50% below Sensible on day-30 net worth.
- Cheap bot (price always $0.50): at least 40% below Sensible on day-60 net worth.
- Hoarder bot (buys 3× its needs): its spoilage cost is at least 15% of revenue.

**Variety check:** the best fixed price on 60°F days and on 90°F days differs by at least $0.30.

## 18. Screens (mobile-first)
- **Title:** 3 save slots, new game, continue.
- **Morning hub:**
  - Top bar: cash, day and season, forecast, rep.
  - Tabs: Shop, Recipe & Price, Staff, Upgrades, Marketing, Map/Stands.
  - A large "Open for business" button.
- **Day view** (Phaser):
  - Street scene, stand, walking customers, the line, and thought bubbles.
  - Clock, sky tint by hour, weather overlay.
  - Speed controls (1x / 2x / 4x / Skip), stock bars, live cash.
- **Evening report:**
  - Revenue and a cost breakdown (ingredients, rent, wages, ads, spoilage), then profit.
  - Customer funnel: passed by, stopped, bought.
  - Top 3 complaints with counts, and an hourly sales chart.
- **Map:** locations, lock state, rent, traffic hints, demographic icons, and event markers.
- **Stats/Milestones** screen.

## 19. Art and audio
- Flat vector style drawn in code: lemon yellow, sky blue, warm neutrals. Archetypes are told apart by color and accessories (cap, briefcase, camera, headband).
- Sky tint changes by hour; clouds and rain particles show the weather.
- Audio is generated with Web Audio: cash ding, pour, ambient street sound, and rain. Includes a mute toggle.

## 20. Parking lot (not in v1)
Extra drinks (pink lemonade, iced tea), loans, competitor AI shops, seasonal decorations, achievements beyond the milestones.
