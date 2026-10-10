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

## M9 — Worth buying (2026-10-10)
Built from `docs/specs/M9-worth-buying.md`. Every price, wage, Promoter, Flyers and `unlockRevenue` value is the spec's starting value; none needed tuning.

**One value differs from the spec**

| Value | Was | Now | Why |
|---|---|---|---|
| `customers.decision.wtpThirstBase` / `wtpThirstScale` | 0.6 / 0.4 | 0.55 / 0.45 | With 2-minute serving, the best fixed price was $1.10 at 60°F and $1.35 at 90°F (Δ $0.25, target $0.30). 0.55/0.45 gives $1.05 vs $1.40 (Δ $0.35). At T_thirst = 1 willingness to pay is unchanged, so the other nine targets barely move. M3 called these two values formula coefficients and left them alone, so this change is in its own commit and **needs the player's sign-off**. If refused, revert that commit and the variety target fails at $0.25. |

**Where the spec was silent (simplest option taken)**
- **`pitcherPrepMinutes` removed** from `service.json` and the schema. It was never read: prep time comes from `upgrades.juicer.tiers[0].prepMinutes`.
- **"Items for sale" in audit checks 1 and 2** means the first tier of Stall, Juicer and Register plus the one-off upgrades that are for sale (Neon sign, Speaker, Weather radio): six items, as in the spec's own table. Higher tiers and things paid daily are left out; staff and Flyers have their own checks (3 and 4).
- **A Mixer already in this week's hiring pool** (a save from before M9) is hidden on the Staff tab and the hire action refuses it. Mixers already hired keep working.
- **Parked upgrades already owned** show as "Owned" on the Upgrades tab; parked ones not owned are not listed. Buying one is refused with "Not for sale".
- **Never-buys bot** still buys licences and moves stands; it never buys an upgrade or hires. The Sensible bot doesn't advertise, so there was nothing to remove there.
- **Skimper bot** buys half of its expected need of every item, including the bulk stock-up of cups and sugar (otherwise its cups would never run short).
- **The Sensible bot's rules are unchanged.** It still tries to buy the Umbrella, Cooler and Fridge; those actions are now refused by the sim.
- **The hiring pool now draws from two roles instead of three**, so a given seed rolls different candidates than before. Still deterministic.
- **Campus Quad unlock target** reads `locations.campus.unlocked` in the bot run; the unlock day is the night it unlocks.

**Results (20 seeds)**
- Balance: 10/10. Campus Quad median day 15 (range 11–21), near the low end of 14–25.
- Audit at Maple Park, checks 1–5 all pass: 3/6 items pay back within 30 days at Maple Park (Stall 17, Neon 20, Weather radio 26 days); 6/6 pay back somewhere in the first five; both staff roles earn their wage at the Financial District (Server +$49.69, Promoter +$15.02 a day); Flyers +$1.66 a day at Maple Park; Never-buys unlocks Campus Quad on day 16 against Sensible's day 15.
- Skimper earns 38% less than Sensible over 28 days, so under-buying is punished; nothing to log in `UNKNOWNS.md`.
- Still failing, as the spec expects until M11/M12: lazy play 97% (target ≤85%), quiet days 80% (≤60%), longest quiet run 32 days (≤10).
- Day view at the Financial District on a 93°F weekday: the line stays short (2 to 3) because people give up fast; 43 of 111 who stopped left by 11:30. "Line too long" bubbles show it clearly. "+N in line" did not appear.
- **Sign-off (2026-10-10):** Benjamin approved the `wtpThirstBase`/`wtpThirstScale` change to 0.55/0.45. PR #3 merged.

## Play log (2026-10-10)
Requested by Benjamin: an internal record of play that doesn't affect gameplay, for design analysis. Spec in GDD §22.
- **UI layer, not the save.** It lives in `src/ui/playlog/` and is stored under `squeeze-city:playlog:<slot>`. Keeping it out of `GameState` means no save migration and no way for it to reach the sim. A test plays five days with the logger receiving deep-frozen inputs and checks the results match a game played without it.
- **Wall-clock time** comes from `Date.now()` in the UI, which the architecture allows outside `sim/`.
- **One log per game.** Loading a slot continues its log if the seed matches. "New game" starts a fresh log.
- **Sessions:** a session ends when the page is hidden. Coming back within 30 minutes continues it; later starts a new one. Hidden time is never counted.
- **"Watching" time** runs from Open for business to the end of the replay (or Skip), not until the report button is pressed.
- **Morning time** counts only time on hub tabs between the report and Open for business.
- **Size:** the newest 200 days and 1,500 actions are kept, roughly 0.5 MB. If localStorage refuses a write, the oldest half is dropped and the write retried; it never throws into the game.
- **Config fingerprint:** each log carries an FNV-1a hash of the full config, so a log can be matched to the tuning it was played on.
- **Export** uses the share sheet when the browser can share files (iPhone, Android), otherwise a download. The file is pretty-printed JSON with one-space indents.

## M10 — Show what it did (2026-10-10)
Built from `docs/specs/M10-show-what-it-did.md`. All numbers are the spec's, in `src/config/feedback.json`.

**Where the spec was silent (simplest option taken)**
- **"Tomorrow" in the projection is the day being planned.** In the morning hub the forecast describes the day about to be played, so the projection runs that day with the forecast as its weather.
- **Projected profit leaves out leftover stock.** The projection gives the stand unlimited stock at today's prices, so spoilage of the surplus isn't counted. Ingredients used by the extra customers are. The measured effect in the report uses the real day's profit, exactly.
- **Campaigns** are judged after their cost per day (cost ÷ days), in both the projection and the report, as in "−$2.80 today after cost".
- **Radio and TV in the report:** rather than storing a 7-day history in the save, today is replayed over 7 sample crowds from the projection stream, with and without the campaign, and the average is shown with "about".
- **Weather radio:** the projection can't measure it, so its card says it helps planning and gives the forecast history. In the report it shows "Forecast right N of the last 10 days" while owned; it never pays off by measurement, so it stays listed.
- **Tiered upgrades:** buying a higher tier marks the lower tier's ledger entry as replaced. Only the top tier is measured: the report drops one tier.
- **Flyers' card** projects for the selected stand's location (or the first open one). The location picker still opens on Buy.
- **Paid-off count:** "Paid off in N days" counts the day of purchase as day 1.
- **Losses:** "Rain kept people home." is added to lines that lost money on a rain or storm day.
- **Yesterday's numbers** for the "why" line are kept in the save (`yesterday`), so they survive closing the app.
- **runDay** takes an optional `customerSeed` so projections can sample made-up crowds. Without it, a day plays exactly as after M9; a test holds the event logs and reports of 3 seeds × 40 bot days to fingerprints recorded on main.
- **Save version 2.** The migration adds a ledger entry for every owned upgrade at its current config cost, earning back from the day of loading; forecast history starts empty.

**Performance**
- With four stands and 31 report lines, `runDayWithAttribution` takes about 450 ms on the build machine, which could be over a second on a phone. So the app runs the day with `runDay` (instant), starts the replay, and works out the attribution in a Web Worker. The report says "Working it out…" in the rare case it isn't ready; it usually is long before the 60-second day ends. If the worker can't start or answer, it falls back to the main thread.
- Purchase-card projections (14 simulated days each, about 30 ms for one stand) are drawn after the tab renders and cached per relevant state.

**One-minute day**
- `MINUTES_PER_SECOND` 3 → 9. To keep the street readable, walking speed went from 34 to 14 world units per game minute and bubbles from 5 to 14 game minutes. On screen that's about 125 px/s and 1.5 s per bubble at 1×, close to before. Measured: a day takes about 63 s at 1× (60 s plus serving the last customers in line).

**Results**
- `npm test`: 113 pass (13 new for M10).
- `npm run balance`: 10/10, identical to the end of M9.
- `npm run audit`: identical to the end of M9, plus the new projection check passing 6/6 (Stall, Neon sign and Register I at Maple Park and the Financial District; worst is Register I at Maple Park, off by 21% on a $0.93-a-day effect).

**Play log v2** records "what your purchases did" each day and how often "Show the math" was opened.

## Sound and look pass (2026-10-10)
Requested by Benjamin ahead of M16, built after M10 (his choice of order). Generated music, as he chose. GDD §19 updated.
- **No asset files, no new dependencies.** All music, ambience and effects are Web Audio synthesis; all art is Phaser graphics and CSS.
- **Music is generative,** not a loop: a look-ahead scheduler plays eighth notes, changing chords at bar lines and picking a new four-bar phrase every 8 bars, so long sessions don't repeat. Randomness here uses `Math.random`/`Date.now`, which is fine in the UI layer; the theory module (`theory.ts`) is pure and unit-tested.
- **Mood mapping** (in `theory.ts`): tempo 66–94 bpm; a low-pass "brightness" that follows the clock (2.4 kHz at opening, 5 kHz at noon, 1.8 kHz at closing), ×0.55 in rain; hats from busy-ness 0.15, kick from 0.5 and never in rain. Busy-ness is cups sold in the last game hour ÷ 36 plus the line ÷ 10, capped at 1.
- **Levels** were set by measuring the output in a headless browser with analysers on each bus (no clipping anywhere; at the default 50% music volume, music sits around −31 dB RMS and peaks around −13 dB; effects peak around −15 dB). Make-up gains per bus are in `engine.ts`. A limiter on the master guards against stacking.
- **Audio pauses** when the page is hidden.
- **Coin pops** are limited to one every 0.45 s, alternating sides, so a rush stays readable.
- **Canvas fallback:** Phaser can only draw gradient fills in WebGL, so on the Canvas renderer the sky is drawn as two bands.
- **The deeper art pass stays in M16** (`docs/ROADMAP.md`): M13 and M15 will change the day scene, so character redesigns and new animation sets wait until then.

## P1 prototype (2026-10-10)
Built from `docs/specs/P1-prototype.md` after Benjamin approved GDD-v2 ("go ahead, get as far as you can without me"). Numbers in `src/config/p1.json`, starting from `scripts/paper-economy-v2.mjs`.

**Values that differ from the paper model**

| Value | Paper | Now | Why |
|---|---|---|---|
| Lemonade cup cost | $0.35 | $0.25 | With $0.35 a handed-off batch earned 98% of careful play (target 85–96%): covering a busy day barely paid. Cheaper cups make extra cover worth it. |
| Day-to-day demand spread | 0.18 | 0.22 | Same reason; together they put the handed-off batch at 96% (the top of the band) and careful play at about $147 a day. |

**Where the spec was silent (simplest option taken)**
- **Code layout:** `src/sim/p1/` (pure sim), `src/config/p1.*`, `src/ui/p1/`. The v1 game is untouched apart from three new bubble kinds and a music on/off switch.
- **Its own mode and save:** a card on the title screen; save under `squeeze-city:p1:save`; its own play log under `squeeze-city:p1:playlog`.
- **One business at a time:** once the drink stand is open, it replaces the market table as the day's business. Gigs stay available every day.
- **Money earned** counts gig pay and each day's profit when positive; a losing day never lowers it.
- **Unsold goods** are credited at the end of the day at half their cost (75% with Thrifty), as the paper model does, rather than carried as stock.
- **Customers** are drawn from their own random stream, independent of batch and price, so "what you missed" replays are exact. Passers-by who don't want any are drawn too, for a lively street.
- **Forecast confidence:** each day is "sure", "fairly sure" or "unsure" (right 92%, 80%, 60%; 79% overall), and the "likely to want" range widens with doubt. The range is counted at the street price; the board says fewer buy above it.
- **Reactions:** "What a deal!" at 135% or more of the price, a smile at 108% to 135%, "Hmm, pricey" below that, walking off below the price.
- **The market table** has a fixed fair price ($2.25), so its customers only smile; the price decision starts at the stand, as the spec says.
- **Moments:** the sold-out sign, the first run of five "What a deal!"s, the first run of three walk-offs, and the busiest hour as a fallback; at most three. Each slows the day to 0.5× for 30 game minutes with a banner.
- **Weekly goal:** units, earnings or "beat your best Saturday", picked deterministically each Monday from what the player has done; meeting it pays a $30 bonus. The week summary is shown with Sunday's report.
- **Sharp eye** shows what the "What a deal!" crowd would have paid, in the live panel and the report, rather than on each bubble.
- **Gig days** are a 20-second sequence of lines (skippable), not the street scene. Each gig shows what it teaches: two made-up neighborhoods' tastes, a stall owner's batch call and how it went, or reactions at a $1 price.
- **No music in P1.** Benjamin found the generated music ominous, and GDD-v2 retires it. Ambience and effects play. Music work waits for his reference tracks.
- **The city is made up** with a Nashville feel (Benjamin's call): neighborhood names like Riverside, Depot Square, Fiddler's Row.

**Checks:** P1 bots 5/5 (`npm run audit`, v2 section): never changing 56%, handed-off 96%, $0.55 24%, stand day 7, cart day 15. `npm run paper` 17/17. v1 balance 10/10 and audit unchanged.
