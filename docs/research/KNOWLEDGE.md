# Game design knowledge base

What we know about making strategy, simulation, tycoon and idle games fun, and about how they fail. It applies to any game in these genres. Squeeze City appears only as a worked example.

This file covers gameplay: mechanics, decisions, feedback, pacing, progression and feel. Marketing, monetization, team and production topics are left out on purpose.

Last updated: 2026-10-09. See the changelog at the end.

## How to use this file

- **Before designing a system**, read its family in the element catalog (section 5) and scan the failure catalog (section 3).
- **Before trusting a claim**, check its tag:
  - `[E]` evidenced: a study, a developer's own statement, official documentation, or documented player behavior such as a solved-strategy guide
  - `[X]` expert or critic opinion: a respected heuristic that has not been tested
  - `[P]` proposal: our own recommendation or number, to be checked with bots and playtests
- **A dagger (†)** marks a game example that was not re-checked against a source. Treat it as an illustration.
- **Every number tagged `[P]`** is a starting point. Tune it against bot results and playtests.
- **The person playing the game outranks this file.** If something here says a design is good and the player is bored, the player is right.

## How this file changes

This file is meant to be edited often.

1. **New research** goes into the section it belongs to, with a tag and a source, and gets a line in the changelog.
2. **When our own development confirms a finding**, add "Confirmed in *game*, *date*" after it. A `[P]` item confirmed twice becomes `[E]`, with our own work as the evidence.
3. **When our own development contradicts a finding**, add "Contradicted in *game*, *date*" with what happened. Contradicted twice, it moves to the retired list in section 16.
4. **Decisions about one game stay out.** They go in that game's `PRINCIPLES.md` (rules adopted), `LESSONS.md` (what we tried) and `TASTE.md` (what its player likes). This file holds what would be true for the next game too.
5. **When a section passes about 150 lines**, move it to its own file in `docs/research/` and leave a summary and a link here.
6. **The master copy** is `docs/research/KNOWLEDGE.md` in the Squeeze City repo. A copy is kept in the Game Development project as `claude/game-design-knowledge-base.md`, so it is available in chat for any game. After editing the master, write it to that project path again.

## Contents

1. Research methods
2. What makes gameplay work
3. How gameplay fails
4. Showing the player what things do
5. Element catalog
6. Economy and balance
7. Progression and skill trees
8. The watched simulation phase
9. Testing
10. Art, audio and feel
11. Cozy design
12. Combinations that reinforce or conflict
13. What to avoid
14. What each reference game teaches
15. What our own development has shown
16. Open questions, disagreements and retired findings
17. Sources
18. Changelog

---

## 1. Research methods

### 1.1 Start from a decision

Write the question as a choice between things to build: "Should staff be hired per day or per week?" Then say what would be built differently for each answer. If nothing would change, the research is not needed. Stop when another source would not change the decision. `[P]`

### 1.2 Describe every mechanic in three layers

`[E]` The MDA framework (Hunicke, LeBlanc and Zubek, 2004) splits a game into mechanics (the rules), dynamics (what happens when players meet the rules) and aesthetics (what that feels like). Designers build from rules toward feelings. Players meet the feeling first.

In this file the three layers are written as **rule → behavior → feeling**. A mechanic copied without its behavior is how features get cargo-culted: the rule is there and the reason for it is not.

### 1.3 How much to trust a source

| Rank | Kind of source | Examples | How to use it |
|---|---|---|---|
| 1 | Peer-reviewed studies | PENS (2006), Jaffe et al. (2012), Holmgård et al. (2018) | Trust the narrow finding. Don't stretch it. |
| 2 | Developers describing their own work | GDC talks, Factorio Friday Facts, Chris Sawyer interviews | Strong for what they did and why |
| 3 | Documented player behavior | Solved-strategy guides, wikis that decode formulas | The best evidence that a decision has one right answer |
| 4 | Frameworks | MDA, Schell's lenses, Meier, Koster | Tools for thinking. They prove nothing. |
| 5 | Reviews and forums | Steam, Metacritic | Signals. Look for complaints that repeat. |

Inside a postmortem, claims differ in reliability. "We tried X, it failed, we replaced it with Y" is the most useful. "We measured Z" is next. "Here is why the game succeeded" is the weakest, because only successful teams get asked. `[X]`

### 1.4 Tearing down a reference game

Ten fields, a few sentences each:

1. **Fantasy and feeling** the game is going for
2. **Loops** at three time scales: seconds, minutes, hours, and how each feeds the next
3. **Decisions** the player repeats: how often, how many real options, what they know beforehand, what feedback follows
4. **Economy**: where resources come from, where they go, what compounds
5. **Progression**: how often something new arrives, and whether it changes what the player does or only the numbers
6. **Legibility**: how the game shows why a result happened
7. **Solved state**: what guides say the best strategy is, and whether it is fun to execute
8. **Where it fails**: complaints that repeat across reviews
9. **Take and avoid**: three mechanics worth adapting, one to avoid
10. **What it means for our game**

### 1.5 Mine solved strategies

Search a game's wiki and forums for "best strategy", "optimal", "formula", "always" and "cheat". Then ask whether the game survived being solved.

- `[E]` **Lemonade Tycoon**: guides give one recipe that works in any weather and tell players to stay in cheap locations. The daily decision collapsed.
- `[E]` **Game Dev Tycoon**: the wiki decoded the review formula. A fixed set of slider settings carries a whole game. The game compares each release with the player's own previous best and penalizes repeating a combination, which helps, but players end up playing from lookup tables.
- `[E]` **Stardew Valley**: guides agree on a most profitable crop loop. The game survived because nothing requires the player to follow it.

The lesson from the three together: a known best answer is survivable when it is optional or situational, and fatal when it is universal and required.

### 1.6 Mine reviews

`[P]` Pick five to eight comparable games. For each, read about 50 of the most helpful negative reviews and 50 positive ones. Sort by playtime: reviewers with 20 or more hours describe late-game problems, and those with one or two hours describe onboarding problems. Tag each review by the mechanic it praises or blames. Keep a finding only if it shows up in three or more games, or in a tenth of one game's sample.

Reviews name symptoms. They rarely name causes.

### 1.7 Choose elements for a particular player

`[E]` Quantic Foundry's Gamer Motivation Model groups 12 motivations into six pairs and is built on a large survey sample. A free profile takes about five minutes. Use it to rank which elements to build first for a known player.

`[X]` Limits: Bartle's player types came from 1990s text-based multiplayer games and are not a validated scale. Some critics argue parts of the Quantic Foundry model measure preferences more than motivations. Use any model to set priorities and never to rule an element out.

### 1.8 Find the fun cheaply

1. `[E]` Model the loop in a spreadsheet or headless script first. Pecorella's idle-game spreadsheets are a template.
2. `[X]` Build the mechanic plain, with no art or animation. Add polish only after the decision is interesting.
3. `[X]` Build one complete slice (one location, one level) before building all of them.
4. `[P]` Write the kill criteria before building. Example: "If the adaptive bot earns less than 15% more than the fixed bot, or the tester can't explain the feature after three days, cut it."

`[E]` Precedent: Dorfromantik's studio made more than ten prototypes in a month and kept one. Its quests were added later to give the building a purpose.

### 1.9 Learn from one playtester

`[P]` With a single tester, comparisons need care.

1. Alternate builds A, B, A for a few days each, changing one thing. Give the builds neutral names.
2. Watch what the tester does more than what they say: which build they keep playing, and how often they change their plan.
3. Have them think aloud in one session and play silently in the next.
4. Ask questions that don't suggest an answer. "What did you do differently today, and why?" is better than "Did you like the new pricing?"
5. Act only on large effects that repeat.

### 1.10 Measure with bots the way card games do

`[E]` Slay the Spire's developers found anecdotal balance feedback depended entirely on each player's style, so they logged how often each card was picked, what it was picked over, and how often decks containing it won. They also warned that such numbers mislead: one weak card showed up often in winning decks for unrelated reasons.

`[P]` The equivalent for any purchasable thing in a management game:

- how often a profit-seeking bot buys it
- how many days it takes to pay for itself
- on what share of days the problem it fixes is actually present
- the profit gap between bots that buy it and bots that don't

Red flags: never bought, or always bought on the first day.

### 1.11 Check for survivorship bias

Before adopting an element because successful games have it, ask:

1. Did games without it also succeed?
2. Did games with it fail?
3. Is it praised for itself, or does it just appear alongside success?
4. Is the evidence from hour 2 or hour 200?
5. Does it survive the solved-strategy check in 1.5?

`[P]` An element that passes fewer than three is expert opinion at best.

### 1.12 Find what we don't know

- Before designing a system, run 1.5 on three games that have it. Other people's failures name the unknowns.
- A playtest surprise is an unknown that was just found. Write it down before fixing it.
- Keep a list of open questions with how each could be answered, and review it at every milestone.

---

## 2. What makes gameplay work

1. `[X]` **A game is judged by its decisions.** Sid Meier's test: a good decision is informed, has a tradeoff, suits more than one play style and gets feedback. (Meier, "Interesting Decisions", GDC 2012)
2. `[X]` **Interesting once is not interesting ten times.** A decision the player repeats needs a best answer that changes with the situation. (Meier, same talk)
3. `[X]` **Players optimize.** Given the chance, they will find the most efficient strategy and repeat it, even when it bores them. The designer has to make sure the efficient path is also the fun one. (Soren Johnson, 2011 and GDC 2022)
4. `[X]` **Loops nest.** What the player does every few seconds feeds what they do every few minutes, which feeds what they do over hours. Each loop's result should be the next loop's input.
5. `[X]` **Depth beats complexity.** Depth is how many meaningfully different situations the rules produce. Complexity is how many rules the player has to hold in their head. A new system earns its place by changing how an existing decision is made.
6. `[E]` **Cause and effect must be readable.** RollerCoaster Tycoon is the benchmark: guests say what they think, and the thought implies the fix. (Chris Sawyer interviews; rct.wiki)
7. `[X]` **Uncertainty helps when the player can plan around it.** A forecast with stated confidence creates a decision. Noise the player can't read creates frustration. (Costikyan)
8. `[E]` **Competence and autonomy keep people playing.** The PENS studies found that feeling capable and feeling in control predicted continued play better than enjoyment ratings did. Part of that evidence was reported by a consultancy with a commercial interest. (Ryan, Rigby and Przybylski, 2006)
9. `[X]` **Introduce one system at a time,** at the moment it starts to matter.
10. `[X]` **Polish multiplies a good decision and cannot replace a missing one.** ("Juice It or Lose It", GDC Europe 2012)

### Core-loop health checklist `[P]`

- First meaningful choice within 60 seconds of starting
- Three to seven meaningful decisions per planning phase
- Every line of a results screen links to a visible cause
- At least three viable strategies within 15% of each other
- No decision has the same best answer on more than 70% of turns or days
- A player who never changes their plan earns at most 85% of one who adapts

---

## 3. How gameplay fails

| # | Failure | How to catch it early | Usual remedy | Example |
|---|---|---|---|---|
| 1 | **Dominant strategy**: one plan always wins | One plan is best in 70% or more of conditions; removing an option costs nothing | Make the best choice depend on the situation; scale costs; rotate demand | `[E]` In Dormans' simulation of SimWar, turtling won 997 of 1,000 games until one cost changed |
| 2 | **Universal recipe**: one setting works everywhere | The best setting is identical across conditions | Customer types with conflicting tastes; conditions that change the ideal | `[E]` Lemonade Tycoon's any-weather recipe |
| 3 | **Degenerate exploit** | A deliberately bad bot beats a sensible one | A quality floor; reputation that decays | `[E]` Lemonade Tycoon's empty-cup recipe |
| 4 | **Optimal play is boring** | The player's plan is unchanged for five or more days | Replace the min-max screen with events and choices | `[E]` Soren Johnson on Civilization III's bargaining table |
| 5 | **Opaque simulation** | The player asks "why?" and can't predict outcomes | Reports that name causes; overlays; agent thoughts | `[E]` Victoria 3's hidden information; Cities: Skylines II's unexplained balance sheet |
| 6 | **Visible agents with dumb rules** | Players screenshot absurd behavior | Simulate in aggregate and animate a sample, or make the rules saner | `[E]` SimCity (2013) citizens walking to the nearest open job each day |
| 7 | **Snowballing** | Profit grows exponentially; bad days stop mattering | Costs that scale with size; competitors that respond; saturation | `[E]` Idle games counter it with exponential costs (Pecorella) |
| 8 | **Death spiral** | Slow or no recovery after a forced bad day | A floor on reputation; cheap recovery actions; loans | `[E]` Victoria 3 bankruptcy spirals players couldn't diagnose |
| 9 | **Dead middle or late game** | Many days since the last new decision | Scenarios, challenges, prestige, new problems | `[E]` Lemonade Tycoon 2 reviews: fun at first; Game Dev Story runs out of novelty |
| 10 | **Chores**: actions with no choice in them | The player does it the same way every time | Automate it once mastered | `[E]` Two Point Hospital's routine; Dave the Diver's side chores |
| 11 | **Feature bloat** | A system that touches nothing in the core loop | Cut it, or connect it to an existing decision | `[X]` Dave the Diver's later additions |
| 12 | **Waiting with nothing to do** | The player skips nearly every time | Give the watcher levers and information; offer speed controls | `[E]` Kingdom Rush pacing complaints; Grand Prix Story's dull races |
| 13 | **False choice** | Forbidding the option costs almost nothing | Merge it with another option or make it distinct | `[E]` Jaffe et al.: a card that could be dropped with no loss |
| 14 | **One correct build** | A sweep of builds has a clear winner | Give nodes situational value; add keystones and anti-synergies | `[X]` A common complaint about RPG skill trees |
| 15 | **Realism as homework** | Spreadsheet screens with few interactions | Turn each real-world system into a decision with visible feedback, or cut it | `[E]` Two Point Hospital's top ratings needing stat scrutiny |
| 16 | **Manipulative rewards** | The player returns from obligation | Remove timers and waits; reward decisions | `[E]` RollerCoaster Tycoon's mobile spin-off |
| 17 | **Difficulty wall** | Bot success drops sharply at one point | Smooth the curve; offer another route | `[P]` |
| 18 | **Same opening every time** | Identical first moves across seeds | Vary the start; add modifiers | `[E]` Game Dev Tycoon players repeating one genre |
| 19 | **Purchases that don't bind** | The problem an upgrade fixes is rarely present | Make the constraint real and visible first | `[E]` Confirmed in Squeeze City, 2026-10-09: 1% of customers left the line, so speed upgrades took 281 to 864 days to pay back |
| 20 | **Pacing tests mistaken for fun** | All balance targets pass and the player is bored | Test separately whether choices matter | `[E]` Confirmed in Squeeze City, 2026-10-09: 10 of 10 balance targets passed while lazy play earned 98% |
| 21 | **Waiting is the best move** | Most days have nothing to buy or unlock; a bot that never spends progresses as fast as one that does | Short goals; steady unlocks; gates that count money earned, never cash in hand | `[E]` Confirmed in Squeeze City, 2026-10-09: 82% of days had nothing to buy |
| 22 | **Flat percentage upgrades** | The player can't say what a purchase did | Show the change in the player's own numbers | `[E]` Jurassic World Evolution's stacking confusion; confirmed in Squeeze City, 2026-10-09 |

---

## 4. Showing the player what things do

### 4.1 What named games do

| Game | Technique | What worked | What was criticized |
|---|---|---|---|
| RollerCoaster Tycoon 1 and 2 | Guests voice thoughts about each ride, such as a price being too high or good value | The thought implies the fix | Gives direction, not size |
| OpenRCT2 | Thoughts grouped by default; tap one to see where on the map guests are having it | Grouping plus location gives a diagnosis | A community remake, not the original |
| Factorio | Production graphs; tooltips showing percent change from base; a later tooltip showing what a machine will actually produce | Exact numbers once stacked bonuses defeated mental math | Players still reach for outside calculators |
| Path of Exile 2 | Hovering a skill node previews the change in stats | Before and after at the moment of choice | Players filed bug reports when the preview broke |
| Two Point Hospital | A room's prestige updates live while building; hiring list sorts by ability and salary | The change is visible before committing | Top ratings need stat scrutiny that feels like paperwork |
| Planet Coaster 2 | Named price tiers in place of a raw number | Presets are easier than a slider | The first game hid price tolerance and players reverse-engineered it |
| Jurassic World Evolution | Flat percentage text on upgrades | Simple | Players couldn't tell whether effects stack |
| Game Dev Tycoon | Score compared with the player's own best; reports after release | Closes the loop | Once decoded, played from wiki tables |
| Cities: Skylines | Dozens of map overlays | The overlay is the before and after | Colors were misread; the sequel lacked alerts |
| Victoria 3 | A deep simulated economy | Watching it grow is engaging | Information hidden on purpose; overloaded screens |
| Into the Breach | Enemy actions shown in advance | Turns each turn into a puzzle | Works because outcomes are certain; noisy games need ranges |

All `[E]` from reviews, official notes and developer posts.

### 4.2 What the successes share `[X]`

1. The effect is shown where the decision is made.
2. The cause is named, as well as the number.
3. Information is grouped first, with detail available on request.
4. When position matters, it is shown on the map.
5. Precision is added once stacked modifiers defeat mental arithmetic.

### 4.3 How it goes wrong

- A flat percentage with no baseline to judge it against
- Deliberate obscurity in a game about optimizing
- So much detail that it feels like paperwork
- `[P]` False precision: "+$4.37 a day" when conditions swing demand by 40%
- `[P]` Honest displays built before the numbers are tuned, which only prove that purchases are useless

### 4.4 A pattern for management games `[P]`

**Before buying**, three lines on the purchase card:

1. **Projection**: the typical gain and its range. Get it by simulating the next several days with and without the item.
2. **Payback**: how long until it pays for itself, here and at the player's other sites.
3. **Why**: the visible problem it fixes, in yesterday's numbers. If the problem isn't present, say so.

The formula sits behind a "show the math" tap.

**After buying**, in the results screen:

- **Twin day**: replay the same day without the purchase and show the difference. For this to be honest, removing the item must not shift anyone else's luck. Two ways to get that: give each customer their own random stream, or draw the same fixed set of random numbers for every customer whether or not they use them. The technique is known as common random numbers. Check which your simulation already does before changing it.
- **Attribution**: mark and count the customers who came because of a campaign.
- **Ledger**: each purchase's running gain against its cost, with a mark when it has paid for itself.
- **One chart**: profit over time with a marker on each purchase day.

**Handling noise honestly:**

- Never credit a purchase by comparing today with yesterday. Conditions differ. Use the twin day or a rolling sum of twin days.
- Report losses as plainly as gains.
- Show ranges before buying and exact figures after.

**How much to show by default:** one sentence and one number, with the full breakdown one tap away and a setting to always show it.

The twin-day technique was not found in any commercial game. It is our proposal, made possible by a deterministic simulation.

---

## 5. Element catalog

Each row gives the rule, what players do because of it, and how that feels; where it worked; where it failed; what the player must be able to see; and a cheap test. Test numbers are `[P]`. IDs are stable, so other documents can cite them.

### A. Core loops and session structure

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| A1 | Plan, simulate, report | Choices lock, then play out → player tests a hypothesis → feels like an experimenter | Lemonade Tycoon; Game Dev Tycoon | Grand Prix Story's dull races | What changed since last time and why | Fixed play earns at most 85% of adaptive. Ask: "What did you try differently today?" | E |
| A2 | Short-loop cadence | Frequent small unlocks → player keeps going → momentum | Kairosoft games; Game Dev Tycoon research | Cafeteria Nipponica's downtime | Progress to the next unlock | Something worth buying on half of days or more. Ask: "When was there nothing to do?" | E |
| A3 | Overlapping goals | Something is always nearly done → player continues past a planned stop → a pleasant pull | Dorfromantik quests; Islanders thresholds | Turns into compulsion when timers are artificial | Distance to each goal | A goal within two days on 70% of days. Ask: "Where did you stop, and why there?" | X |
| A4 | Natural stopping points | Clear closure → player stops satisfied → feels respected | RollerCoaster Tycoon scenario ends; Stardew day end † | Idle games with no stopping point | A summary at the boundary | Ask: "How did your last session end?" | X |
| A5 | Scenarios inside a sandbox | An optional objective with a deadline → player plans toward it → purpose with freedom | RollerCoaster Tycoon; Islanders runs | Two Point Hospital's rebuilds from scratch | The objective and deadline | A good bot completes 30 to 80%. Ask: "What were you aiming for this week?" | E |

### B. Decisions and tradeoffs

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| B1 | Situational pricing | What people will pay shifts with conditions → player re-prices → reading the market | Lemonade Tycoon; RollerCoaster Tycoon; Planet Coaster 2 tiers | Planet Coaster's hidden tolerance | Reactions to price; who left because of it | Adaptive pricing beats the best fixed price by 10%. Ask: "How did you pick today's price?" | E |
| B2 | No universal best recipe | Fit varies by customer and place, and repeating wears off → player tunes per place → discovery | Game Dev Tycoon's fit matrix and repeat penalty | Lemonade Tycoon's any-weather recipe; wiki tables | Reactions by customer type | Best fixed recipe earns at most 85% of adaptive. Ask: "Did any reaction surprise you?" | E |
| B3 | Perishable stock | Stock spoils → player forecasts demand → mild tension | Lemonade Tycoon's ice | Solved when the forecast is perfect | Waste and stock-out counts | Over- and under-stocking bots earn differently. Ask: "How did you decide how much to buy?" | E |
| B4 | Opportunity cost | One pool of money → player compares options → weighty choices | Islanders | Game Dev Story's late abundance | Alternatives side by side | A profit-seeking bot's buying order varies by seed. Ask: "What did you almost buy instead?" | E/X |
| B5 | Sidegrades | Options trade off, not stack → player builds a style → identity | Slay the Spire; Into the Breach squads | Jurassic World Evolution's flat upgrades | Tradeoffs in the same units | Different bots pick different options. Ask: "How would you describe your style?" | E/X |
| B6 | Specialize or generalize | Specialists excel narrowly → player picks a niche → ownership | Two Point Hospital staff | Wages outgrowing income late | The bonus and the lost coverage | Compare profit by site for each approach | E |
| B7 | When to expand | Investment compounds but risks cash → player times it → strategy | Idle-game math (Pecorella) | Hoarding when nothing pays back | Payback time; cash runway | Is there a best day to expand, and does it vary? Ask: "How did you decide when?" | E/X |
| B8 | Push your luck | An optional gamble → player weighs odds → a small thrill | FTL events † | High variance breaks a calm tone | Honest odds | Gamble's expected value within 10% of the safe option | X |
| B9 | Telegraphed conditions | Tomorrow is forecast → player plans around it → puzzle | Into the Breach | Full certainty is solvable | The forecast and its confidence | A bot with perfect information beats one with none by under 30% | E |

### C. Economy

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| C1 | Income balanced by costs | Rent, wages and stock offset sales → money keeps mattering → stakes | Lemonade Tycoon rent tiers | Game Dev Story too easy late | Profit and loss by category | Cash relative to daily cost stays bounded. Ask: "Did money ever feel meaningless?" | E |
| C2 | Scaling costs | Each further unit costs more → player spreads purchases → steady pacing | Idle games (Pecorella) | Big numbers lose their novelty | The next cost and its payback | A few days between purchases. Ask: "What were you saving for?" | E |
| C3 | Cannibalization | A second site nearby takes sales from the first → player spreads out → the map matters | City-builder coverage † | Invisible caps feel arbitrary | "This stand took 40 sales from that one" | Profit added by each further site | P/X |
| C4 | Bottleneck-driven upgrades | An upgrade relieves a visible, binding constraint → player sees the cause, buys, sees the change → understanding | Factorio; Two Point Hospital queues; RollerCoaster Tycoon queue thoughts | Any game where the constraint rarely binds | Today's binding constraint | The constraint is present on a quarter of days or more. Ask: "What limited you today?" | E |
| C5 | Supply chains | Inputs feed outputs → player balances them → engineering satisfaction | Factorio; Big Pharma † | Players needing calculators | Throughput at each stage | Does one extra step create a real choice? | E |
| C6 | Competitors that respond | Rivals react to the player's success → player adapts → a living world | Lemonade Tycoon 2 Money Mode; Game Dev Tycoon trends | Rivals that keep pace by magic feel unfair | The rival's price or move | Does a dominant strategy draw a counter? | E/X |
| C7 | Recoverable failure | Warnings and rescue options, then failure → player rescues the business → drama without dread | Cozy-design guidance (section 11) | Victoria 3's spirals | A runway meter and early warning | Good bot fails 0 to 5% of the time; lazy bot 20 to 40%. Ask: "How did the bad stretch feel?" | E/P |
| C8 | Rent against traffic | Busy places cost more → player weighs margin against volume → location strategy | Lemonade Tycoon | Players staying in cheap spots | Rent, traffic and break-even | Every site is best for some bot in some conditions. Ask: "Why here today?" | E |

### D. Customers and agents as feedback

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| D1 | Grouped thoughts | Agents' reasons are grouped and counted → player fixes the top complaint → feels heard | RollerCoaster Tycoon; OpenRCT2 | Ungrouped, they are spam | The top three with counts | The top thoughts change after a fix. Ask: "What were customers telling you?" | E |
| D2 | Visible queues with walk-aways | Long lines make people leave → player invests in speed → visible relief | RollerCoaster Tycoon; Two Point Hospital | Queues that never get long | Line length and a count of who left | Peak walk-aways of 5 to 25% before upgrades | E |
| D3 | Types with conflicting tastes | Groups want different things → player targets a crowd → knowing the market | Lemonade Tycoon 2; Game Dev Tycoon audiences | Types that differ only in numbers stay invisible | The mix by place and time | The best setting differs by place. Ask: "Who were your customers today?" | E |
| D4 | Regulars and loyalty | Satisfied customers return → player protects quality → warmth | Stardew friendships † | Grindy loyalty meters | A named regular coming back | Cutting quality costs long-run profit | X |
| D5 | Critics | A periodic judge → player prepares → a scored moment | Game Dev Tycoon reviews | An opaque formula sends players to wikis | The score broken down | Scores spread by bot type | E |
| D6 | Reputation as a slow stock | Rises with satisfaction, falls with neglect → player cares about quality → a long arc | Lemonade Tycoon; Two Point stars | Hidden reputation math | The meter and its last few causes | A quality bot and a corner-cutting bot diverge | E |

### E. Map and placement

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| E1 | Spot choice with traffic that varies by hour | Flows shift through the day → player places or moves → spatial puzzle | Lemonade Tycoon news shifting crowds; Cities: Skylines traffic | Hidden flows mean guessing | Flow arrows or a heatmap | The best spot varies by hour. Ask: "How did you choose the spot?" | E |
| E2 | Overlays | Toggle a view of traffic, wealth, rivals → player diagnoses → expert vision | Cities: Skylines | Misread colors; no alerts in the sequel | One tap, with a legend | Ask: "What does this color mean to you?" | E |
| E3 | Adjacency bonuses | Neighbors change a spot's value → player arranges → elegant puzzle | Islanders; Dorfromantik | Guides that map the optimal cluster | A live score while placing | Searched placement beats random by 15% | E |
| E4 | Scouting | Information is revealed by a trial or a paid survey → player experiments → discovery | Fog of war † | Pure guessing feels unfair | "Estimated" against "measured" | What is the information worth? | X/P |
| E5 | Location identity | Each place poses its own problem → player re-learns → fresh mastery | Lemonade Tycoon 2; Two Point Hospital levels | New places that are just bigger numbers | A one-line personality and hints | Each place's best strategy differs. Ask: "How is this place different?" | E |

### F. Staff

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| F1 | Hiring with traits | Candidates differ → player compares → personality | Two Point Hospital | Late wage creep | Each trait's projected effect | No trait is strictly best. Ask: "Why this person?" | E |
| F2 | Roles that add abilities | A role does a new thing, where a bonus only adds a percentage → new capabilities → delegation feels like growth | Two Point Hospital roles; Kairosoft staff † | A percentage bonus on a constraint that doesn't bind | "Sam restocked twice and saved 46 sales" | A twin day per staff member. Ask: "What did your staff do today?" | X/P |
| F3 | Training and morale | Staff improve and tire → player invests and schedules → attachment | Two Point Hospital | Its sequel streamlined training after complaints | The effect of a level; mood | Gain against the attention it costs. Ask: "Was anything a chore?" | E |
| F4 | Automate solved chores | A mastered task is handed to a manager → player moves up a level → earned relief | Universal Paperclips; idle-game managers † | Automating before the player understands removes the game | What the manager did | Automated play reaches about 90% of adaptive. Ask: "Which task did you happily hand off?" | E/X |

### G. Progression

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| G1 | Skill tree | Points from milestones → player picks an identity → ownership | Path of Exile 2's hover preview; Kingdom Rush's forked towers | Huge trees †; trap nodes; no respec | The change on selecting a node | No build more than 15% ahead. Ask: "Which branch are you heading toward, and why?" | E/X |
| G2 | Research tree | Spend to unlock options → planning | Game Dev Tycoon; Two Point Hospital | Linear mandatory paths | What each node enables | Research order varies by seed | E/X |
| G3 | Unlock cadence | Something new every few days → anticipation | Kairosoft | Game Dev Story late on | The next unlock and its cost | Longest gap of a week or less. Ask: "What are you looking forward to?" | E |
| G4 | Discovery of combinations | Hidden combinations → player experiments → the "aha" | Game Dev Tycoon; Potionomics † | Wiki tables turn it into lookup | A book with silhouettes of the undiscovered | An exploring bot finds half in a month. Ask: "What did you discover today?" | E |
| G5 | Milestones and objectives | Explicit targets → player plans → achievement | RollerCoaster Tycoon scenarios; Dorfromantik quests | "Earn more money" alone feels hollow | The list | Time to each milestone varies across seeds. Ask: "What goal are you working on?" | E |
| G6 | Star ratings | One to three stars per level or site → player revisits → completion | Two Point Hospital; Kingdom Rush | Three stars needing paperwork-level scrutiny | The criteria as a checklist | A good bot gets three stars in a reasonable time | E |
| G7 | Prestige or difficulty ladder | Reset for a multiplier, or climb harder levels → faster or harder reruns | Idle games; Slay the Spire's Ascension | Rebuilding from scratch; grinding for permanent power | The gain before resetting | Ask: "Would you start over? Why?" | E/X |
| G8 | Long-term aspirations | Optional large goals → a horizon | Dorfromantik; Islanders | Victoria 3: nothing left once the economy is stable | The list | Ask: "What's your long-term plan, if any?" | E |
| G9 | Beat your own best | Targets come from the player's own record → always relevant | Game Dev Tycoon | A bar that rises too fast | "Best Tuesday $84, today $79" | The record falls every 5 to 10 days. Ask: "How did today compare?" | E |

### H. Idle and incremental mechanics

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| H1 | Offline progress | The game earns while closed → a bonus on return | Idle games | Rewards leaving in a game about deciding | "While you were away" | Ask: "Did you want it to run without you?" | E/X |
| H2 | Active against idle | Optional input boosts output → player chooses how engaged to be | Clicker and idle hybrids | Forced clicking | The size of the boost | Active play earns at most 20% more than passive | E |
| H3 | Unfolding mechanics | Start with one control; systems appear when relevant → curiosity | Universal Paperclips; A Dark Room † | Too slow bores; too fast overwhelms | Only what matters now | Ask: "What new thing appeared, and what did you think it was for?" | E |
| H4 | Numbers going up | Ever larger numbers → a sense of growth | Idle games | The novelty has worn off (Pecorella) | Growth against the player's own past | Ask: "What felt like progress?" | E |

Exponential costs are C2. Automation is F4.

### I. Events and variety

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| I1 | Weather and seasons | Demand and taste shift → player re-plans | Lemonade Tycoon | Weather with no readable pattern | A forecast with confidence | Weather explains 20 to 40% of the variance in profit | E |
| I2 | News | A headline shifts crowds or spending somewhere → player re-routes | Lemonade Tycoon | Ignored when the effect is small | Headline, place and size | Following the news earns 10% more | E |
| I3 | Planned festivals | Known future events → player prepares → anticipation | Stardew † | Routine by the second year | A calendar | Preparing pays | X |
| I4 | Crises with recovery | A shortage, inspection or heatwave → player adapts → relief | RollerCoaster Tycoon breakdowns † | Victoria 3's invisible cascades | A warning, options and a way out | A good bot recovers within five days nine times in ten | X/P |
| I5 | Weekly modifiers | A rule changes for a week → strategy shifts | Slay the Spire daily challenges | Arbitrary modifiers feel like noise | A banner and the effect | The best plan changes in half of weeks | E/X |

### J. The watched simulation phase

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| J1 | Optional abilities on a cooldown | One or two taps per phase → player watches for the moment → light agency | Kingdom Rush † | Mandatory taps become a chore | The cooldown and the effect | Worth at most 10% of a day's result. Ask: "When did you use it, and why then?" | X/P |
| J2 | Mid-phase decision with a default | A prompt that resolves itself after a few seconds → engaged without pressure | Football Manager shouts † | Pausing to manage, then a minute of play | The default | Ask: "Did anything interrupt you in a way you disliked?" | E/X |
| J3 | Speed controls and skip | The player sets their own attention → respect | Most simulations | Slow even at top speed (Victoria 3) | Buttons always in reach | Under half of days skipped | E |
| J4 | Highlights | The replay emphasizes key moments → player watches the best part | Football Manager † | Equal weight on everything is dull | Markers on a timeline | Ask: "What was the most interesting moment?" | E/X |
| J5 | Service minigame | The player serves by hand → skill | Diner Dash †; Good Pizza, Great Pizza † | A daily chore | (none) | Ask: "Would you play the serving part every day?" | X |
| J6 | Readable live agents | Thought bubbles and visible departures → player reads the crowd → connection | RollerCoaster Tycoon | Too many bubbles is noise | Three to five bubbles, prioritized | Ask: "What were people thinking?" | E |

### K. Information and feedback

Section 4 covers this family in depth.

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| K1 | Projection before purchase | Typical change, range, payback and cause → informed purchase → confidence | Factorio's output tooltip; Two Point Hospital's prestige bar | Flat percentages; tooltip income that never arrived | Three lines | Projection within 25% of the measured effect. Ask: "What did you expect it to do?" then "What did it do?" | E/P |
| K2 | Live change on selection | Old value → new value at the moment of choice | Path of Exile 2; Factorio | Broken previews | Old → new | Ask: "What changed when you selected that?" | E |
| K3 | Twin-day comparison | The same day replayed without the purchase → exact effect → trust | Not found in a commercial game | Leaks noise without per-agent random streams | "+31 against the same day without it" | An item with no effect shows exactly zero | P |
| K4 | Attribution tags | Customers marked and counted by why they came → marketing becomes visible | RollerCoaster Tycoon's per-guest reasons | Tags nobody counts are decoration | An icon and a count | Tags agree with the twin day | E/P |
| K5 | A report that explains the change | The difference from yesterday split into causes → player learns causes | Game Dev Tycoon reports | Cities: Skylines II's unexplained balance sheet | The top three causes | Causes sum to the total. Ask: "Why was today different?" | E |
| K6 | One graph with purchase markers | A line over time → player sees where the trend changed | Factorio | Too many graphs feel like a spreadsheet | One graph | Ask: "What does this line tell you?" | E |
| K7 | Advisor names the constraint | One line says what is holding the player back → focus | Two Point Hospital alerts | Cities: Skylines II lacking alerts | One line per report | Agrees with a profit-seeking bot's top pick 70% of the time | E |
| K8 | Formula on request | A "show the math" panel → trust and learning | Factorio; players decoding Game Dev Tycoon | Math by default overloads | Collapsed by default | Ask: "Did you open the math? What were you looking for?" | E |
| K9 | Teach each system when it appears | Explain it the first time it matters | Universal Paperclips; Dorfromantik | Tutorials up front get skipped | Hints at the right moment | Ask: "What, if anything, was confusing?" | E |
| K10 | Purchase ledger | Running gain against cost, with a "paid off" mark → satisfaction | Our proposal | Paperwork if forced on the player | A tab | Most items paid off within a month. Ask: "Which purchase was your best?" | P |

### L. Expression and ownership

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| L1 | Decoration with an effect | Decor raises appeal → player decorates with purpose → pride | Two Point Hospital; Restaurant City † | Re-decorating every level | An appeal meter | Decor isn't the dominant purchase | E |
| L2 | Naming | The player names things → attachment | RollerCoaster Tycoon; Game Dev Tycoon | Little risk | Names in reports | Ask: "What did you name it?" | E |
| L3 | Cosmetic customization | Expression with no optimization pressure | Two Point Hospital traits; Islanders | May be ignored | Visible in the world | Ask: "Did you customize anything?" | E/X |

### M. Game feel in menu-heavy games

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| M1 | Juice on sales and purchases | Small animation and sound on each event → actions feel alive | "Juice It or Lose It" (2012) | Overdone, it costs immersion; screen shake can cause motion sickness | A reduced-motion setting | Alternate builds with it on and off | X |
| M2 | Staged reveal of results | Results appear in sequence → anticipation | Idle games †; Game Dev Tycoon's review reveal † | Reveals that can't be skipped | Tap to skip | Ask: "How did the end of the day feel?" | X |
| M3 | Sound as feedback | Distinct sounds for distinct events | Optional: Universal Paperclips is silent | Repetitive sounds wear on players | A mute control | Ask: "Did any sound stick with you?" | X |

### N. Cozy design

| ID | Element | Rule → behavior → feeling | Worked in | Failed in | Player must see | Cheap test | Tag |
|---|---|---|---|---|---|---|---|
| N1 | Safety, abundance, softness | Warm visuals and met needs → low arousal while engaged | Project Horseshoe's 2017 report; Dorfromantik | Cancelled by threat, pressure or intense stimulus | (none) | Ask: "How did you feel after the session?" | X |
| N2 | Calm puzzle with a score | No timer while planning, plus a target → stimulating calm | Islanders; Dorfromantik | Critics split on Dorfromantik's depth | A score preview | Ask: "Did you feel rushed at any point?" | E |
| N3 | Optimal play is optional | A best path exists and nothing requires it → relaxed mastery | Stardew Valley | Lemonade Tycoon's single required solution | (none) | A casual bot reaches every main goal, more slowly | E |

---

## 6. Economy and balance

### 6.1 Vocabulary

`[X]` Adams and Dormans describe an economy as sources (where a resource enters), sinks (where it leaves), converters (one resource into another) and stores. Drawing a game's economy with those four shapes shows what compounds and what never gets spent.

### 6.2 Growth

`[E]` Idle games set costs to rise exponentially against income that rises more slowly, so each purchase stays a decision (Pecorella). Applied to any management game: the cost of an upgrade should grow faster than the profit it adds, so payback lengthens gradually.

`[E]` Simulating many games with scripted strategies finds a dominant strategy and the one cost that controls it. In Dormans' study the lever that mattered was not the one the author expected.

### 6.3 Target numbers `[P]`

| Measure | Early | Middle | Late |
|---|---|---|---|
| Days between new decisions or unlocks | 1 to 2 | 2 to 4 | 3 to 6 |
| Profit gap, best strategy to third best | 25% or less | 15% or less | 15% or less |
| Days to recover from a forced bad day | 3 or fewer | 4 or fewer | 5 or fewer |
| Share of days a bad decision causes a loss | 10 to 30% | 15 to 35% | 15 to 35% |
| Sensible bot going bankrupt | never | under 2% | under 2% |

At every stage, at most three or four days in a row should pass with nothing to buy, unlock or complete.

**Payback time is unsettled.** Our first research pass proposed 2 to 4 days early, rising to 6 to 12 late. The second proposed 5 to 12 early, 10 to 20 in the middle and never over 30. Both are guesses. Start in the overlap and let playtests decide.

### 6.4 Turning real-world systems into decisions

A piece of realism belongs in the game when it creates a decision with visible feedback.

| Real system | The decision | What the player sees | It becomes homework when |
|---|---|---|---|
| Foot traffic by hour and day | Where to set up, when to move | A heatmap; crowd density | The player reads hourly tables |
| Price elasticity | A price for these customers in these conditions | "Too pricey" reactions by type | It is hidden and precise to the cent |
| Cost of goods | Quality against margin | Taste reactions; margin per unit | The player does ingredient math by hand |
| Spoilage | How much to stock | A waste line; visible decay | There is no forecast |
| Staffing and queues | Capacity against wages | Queue length; people leaving | It needs shift schedules |
| Marketing | Where and when to spend | Customers tagged by campaign | Returns are linear and invisible |
| Reputation | Profit now against standing later | A meter with named causes | It drifts slowly with no explanation |
| Cash flow and loans | Borrow to grow, or wait | A runway forecast | It needs interest calculations |
| Competition | Undercut, differentiate or move | A visible rival | Rivals never change |
| Weather and seasons | Adapt stock, recipe and place | A forecast with confidence | It can't be forecast |
| Rent and permits | A premium spot or a cheap one | Rent on the map | It adds paperwork screens |

`[E]` Two results from operations research help here. The **newsvendor problem** says the best stock level depends on margin against the cost of waste: high margins favor overstocking and costly spoilage favors understocking. That gives a best answer that changes with the situation. **Queueing theory** says waits grow sharply as arrivals approach capacity, which is why adding a second server visibly collapses a line.

---

## 7. Progression and skill trees

### 7.1 Principles

1. `[X]` Every point spent should cost the player another appealing option.
2. `[X]` Nodes that change what the player can do beat nodes that add a few percent. `[E]` Kingdom Rush's towers upgrade three times and then fork into two distinct final forms: few choices, each of which changes play.
3. `[P]` Build variety can be tested with a sweep of bots.
4. `[X]` Allow respec at a modest cost.
5. `[X]` Late nodes should add options, not bigger numbers.
6. `[E]` Show the change on selecting a node (Path of Exile 2).

### 7.2 A small tree that avoids the common failures `[P]`

About 24 nodes in four branches of six. One point every two to three days early, slowing later. Only about 60% of nodes reachable in one playthrough, so the tree is a choice. Each branch ends in a keystone that changes how the game is played and carries a cost. Some nodes across branches work against each other, and at least one pair works together.

### 7.3 Tests for a dominant build `[P]`

- Sample a few thousand legal builds over many seeds. Flag the tree if the best build beats the tenth-best by more than 15%.
- Forbid each branch in turn. If the loss is under 3%, the branch is weak.
- A node chosen by under 5% of the top quarter of builds is filler.

### 7.4 Long-term goals in a game with no ending

- `[E]` Scenarios with objectives (RollerCoaster Tycoon)
- `[E]` Star ratings per level or site (Kingdom Rush, Two Point Hospital)
- `[E]` Targets set from the player's own record (Game Dev Tycoon)
- `[E]` Optional quests laid over an endless board (Dorfromantik)
- `[P]` An optional restart that unlocks different starting conditions

---

## 8. The watched simulation phase

### 8.1 Design

1. `[P]` Reward attention and never punish skipping. Skipping should hand control to a competent default.
2. `[E]` Give the watcher a lever. Football Manager restored touchline shouts in an update after shipping a version without them.
3. `[E]/[X]` A few optional abilities on long cooldowns work (Kingdom Rush). Many mandatory ones become a chore.
4. `[E]` Pacing matters more than spectacle. Always offer speed controls.
5. `[E]` Emphasize the moments that matter. Equal weight on everything is dull.

### 8.2 How much watching should be worth `[P]`

- Skipping reaches about 90 to 95% of what an attentive player earns on the same plan.
- Abilities and choices add 5 to 10% on a normal day, and at most about 20% in total.
- Nothing is locked behind watching.
- Skipping is named positively in the interface.

### 8.3 Architecture for a deterministic simulation that accepts input mid-phase

The recommended shape is a stepped simulation with a command log.

1. `[E]` **Fixed timestep.** Advance the simulation in fixed steps regardless of frame rate, and cap catch-up steps (Fiedler, "Fix Your Timestep!").
2. `[E]` **Commands, not direct changes.** The interface creates commands stamped with a tick. The simulation applies them at tick boundaries. A recorded command list replays a session exactly (Nystrom, *Game Programming Patterns*).
3. `[P]` **Random streams that inputs can't disturb.** Generate the phase's arrivals at its start from a stream no action can touch. Give each agent their own stream, seeded from the day and the agent's ID. A mid-phase action then changes only the agents it affects, and "with against without" comparisons stay honest.
4. `[P]` **Skipping is a policy.** A policy takes what the player could see and returns commands. Skip runs the default policy to the end. Each bot is a policy.
5. `[P]` **Prompts with deadlines.** The simulation announces a decision with options, a default and a deadline tick. With no answer by the deadline, the default applies.
6. `[P]` **Save the inputs.** A save holds the starting state, the plan, the command list and the current tick. Loading replays from the start.
7. `[E]` **Guard determinism.** Factorio's desyncs came from math functions that differed by platform and from sort comparisons that allowed ties. In JavaScript or TypeScript: round the results of floating-point math functions before branching on them, give every sort a tie-breaker, never rely on object key order, and hash the full state in tests.

Other shapes considered: generators that pause at decisions (pleasant to write, but their state can't be saved) and checkpoint-then-resimulate (useful later for scrubbing and "what if" previews).

**Tests to add** `[P]`: the stepped simulation run to the end matches the old all-at-once result; the same commands give the same state hash across many seeds; a command at tick *t* changes nothing before *t*; the arrival schedule is identical with and without commands.

---

## 9. Testing

### 9.1 Four checks that prove different things

| Check | Proves | Doesn't prove |
|---|---|---|
| Unit tests on formulas | Each formula matches the design | That the design is good |
| Pacing targets (how fast money grows) | The game moves at the planned speed | That choices matter |
| Decision audit (lazy against careful play; payback of each purchase) | Playing well beats playing lazily; purchases are worth buying | That it is fun |
| A person playing | Whether it is fun | (nothing else can) |

`[E]` Confirmed in Squeeze City, 2026-10-09: the second and third checks are independent. A build passed every pacing target and failed every audit check.

### 9.2 What the research says about bots

- `[E]` **Restricted play** (Jaffe et al., 2012): forbid one option and measure the loss. A small loss means a false choice.
- `[E]` **Personas** (Holmgård et al., 2018): several bots with different goals reveal more than one optimizer.
- `[E]` **Scripted strategies at scale** (Dormans, 2011): a thousand simulated games per variant find dominant strategies.
- `[E]` **Bots at a human level** (de Mesentier Silva et al., 2017): simple heuristic bots found rule gaps in a published board game.
- `[E]` **Human-like agents** (Gudmundsson et al., 2018) predict difficulty and need far more player data than a small project has.
- `[E]` Every one of these papers says bots cannot measure feel or enjoyment.

### 9.3 A bot roster for a management game `[P]`

| Bot | What it does | What it reveals |
|---|---|---|
| Sensible | Reads the forecast and plans well | The baseline |
| Greedy and Cheap | Highest and lowest price | Whether price matters; whether quality has a floor |
| Empty | Sells a worthless product | Exploits |
| Hoarder | Overstocks | Whether waste bites |
| Static | Never changes its plan | Whether adapting matters |
| Never-X | Never uses one feature | False choices |
| Searcher | Tries many plans per condition | Dominant strategies |
| Skipper and Watcher | Default against active play | The size of the bonus for watching |
| Shock | Forced bad days | Recovery and death spirals |

Keep bot behavior fixed while tuning. A bot rewritten to make a target pass no longer measures anything.

### 9.4 A playtest with one person `[P]`

1. Before: write down what the change is expected to do.
2. During: a short session, thinking aloud. Mark each moment of boredom, confusion, delight or frustration.
3. After, ask questions that don't lead:
   - "What were you trying to do on day three?"
   - "When did you last change your plan, and why?"
   - "Was there a moment you wanted to skip? What was happening?"
   - "What caused your best and worst day?"
   - "Which choice felt most like yours?"
4. Turn each mark into a logged lesson, a hypothesis, a change, a bot check and the next playtest.

### 9.5 What an AI can and can't judge

`[P]` An AI can run and read bot results, walk through screens against usability heuristics such as HEP and PLAY (Desurvire and colleagues), and reason about what different kinds of player would choose. It cannot tell whether something is boring, beautiful or satisfying. It has to ask.

---

## 10. Art, audio and feel

All `[X]` unless marked.

**Principles**

1. Readability first: distinct silhouettes; icons that read at small sizes.
2. A limited palette, with a few accent colors kept for gameplay signals.
3. Consistent rules: one light direction, one outline weight, one corner radius.
4. Animation and sound on the events that matter.
5. Time-of-day tint and weather effects are cheap and add a lot.
6. Show a readable sample of a crowd and summarize the rest.

**Where effort pays most** `[P]`, in order: a consistent palette and interface kit; animated feedback on sales and losses; time-of-day and weather; ambience that scales with the crowd; simple walk cycles; visual customization.

**Audio**

- Adaptive music: add layers as activity grows; change sections at bar boundaries; short stingers for events.
- In a browser, schedule notes slightly ahead on the audio clock. Keep generated music on its own random stream so it never affects the simulation.
- Sound as information: pitch variation on repeated sounds; crowd murmur tied to queue length.
- Lower the music under interface sounds, and limit the master output.

**Failure modes**: visual noise hiding signals; repeated sounds wearing on the player; mismatched asset packs; screen shake causing discomfort.

---

## 11. Cozy design

`[X]` Project Horseshoe's 2017 report describes coziness as safety, abundance and softness. It lists what cancels it: threat and danger, pressing short-term demands, and intense stimulus.

How calm games stay mentally engaging:

- `[E]` Planning has no timer, and there is a score to chase (Islanders, Dorfromantik).
- `[E]` A best strategy exists and nothing requires it (Stardew Valley).
- `[P]` Failure is slow, announced in advance and recoverable, with a gentler mode available.
- `[X]` Feedback is soft: no screen shake, and a reduced-motion setting.

---

## 12. Combinations that reinforce or conflict

### Reinforcing `[X]/[P]`

1. A binding constraint, a "why" before purchase and a twin day after (C4, K1, K3): problem, explanation, proof.
2. Customer types, location identity and recipe discovery (D3, E5, G4): discovery is worth repeating at each place.
3. Grouped thoughts and overlays (D1, E2): tap a complaint and see where it is happening.
4. Milestones, skill points and beat-your-best (G5, G1, G9): a steady drip that closes quiet stretches.
5. Automation and unfolding systems (F4, H3): hand off what is mastered and reveal a larger problem.
6. A deterministic simulation with bots and a twin day: one engine for audits, projections and attribution.

### Conflicts and how acclaimed games resolved them

| Conflict | Resolution seen | Tag |
|---|---|---|
| A short simulated phase against mid-phase decisions | Put the thinking before the action (Into the Breach). Allow at most a couple of optional taps and one prompt with a default. | E/X |
| A cozy tone against bankruptcy | Make failure slow, announced and recoverable. Offer rescue options. | X/P |
| An endless sandbox against strong goals | Layer optional goals over the sandbox (RollerCoaster Tycoon, Dorfromantik, Game Dev Tycoon). | E |
| Realism against legibility | Choose legibility. Cities: Skylines sends gridlocked cars home so players can read the map. | E |
| Showing the math against calm | A few plain lines by default; the formula on request. | E/P |
| A known optimum against replay value | Make the best choice situational, or optional, and never universal. | E |
| Juice against calm | Soft feedback, no shake, a reduced-motion setting. | X |
| Automation against engagement | Automate only what is mastered, and add a new decision at the same moment. | E/X |

---

## 13. What to avoid

- `[E]` **Flat "+X%" upgrades**: no baseline to judge them against.
- `[E]` **Big numbers as the main reward**: the novelty has worn off.
- `[X]` **Offline progress in a game about decisions**: it rewards leaving.
- `[E]` **Restarting from scratch as progression** in a game about building places.
- `[E]` **Morale and training micromanagement**: complained about, then streamlined in a sequel.
- `[E]` **Deep supply chains in a light game**: players need calculators.
- `[E]` **Hidden formulas in a game about optimizing.**
- `[X]` **A service minigame every day.**
- `[X]` **Heavy screen shake.**
- `[X]` **Bartle types as a way to choose features.**
- **Manipulative patterns** `[E]/[X]`: energy timers, paid waits, streaks that punish absence, "come back or it spoils" notifications, and pressure built on fear of loss.

---

## 14. What each reference game teaches

| Game | Does well | Where it fell short | Lesson |
|---|---|---|---|
| Lemonade Tycoon 1 and 2 | The daily loop of stock, recipe, price and place; weather and news; many locations | One recipe works in any weather; cheap locations are safest; "fun at first" | Breadth does not fix a solved core decision |
| RollerCoaster Tycoon | Guests as readable feedback; scenarios on one sandbox; ride types with real pros and cons | Thoughts give direction, not size | Show causes through the agents themselves |
| Game Dev Tycoon and Game Dev Story | Discovering combinations; reviews that reveal hidden quality; competing with your own best | Decoded formulas; late-game abundance | Hidden formulas are fun until found; then the target has to move |
| Kingdom Rush | Placement before the action, abilities during it; tight forked upgrades; star ratings | Slow waves | Few choices, each of which changes play; always offer speed controls |
| Two Point Hospital | Live feedback while building; roles that gate what works; queues as a puzzle | Routine; paperwork for top ratings; rebuilding each level | Automate chores once mastered |
| Cities: Skylines | Overlays; visible agents; sandbox satisfaction | Misread overlays; the sequel's missing alerts | An overlay needs a legend and an advisor |
| Factorio | Exact numbers once bonuses stack; graphs | Outside calculators | Add precision when mental math fails |
| Dave the Diver | Phases that feed each other; a satisfying nightly report | Later additions diluted the loop | Every system should touch the core |
| Dorfromantik and Islanders | Calm planning with a score; quests on an endless board | Depth questioned by some critics | Cozy and brain-engaging can coexist |
| Stardew Valley | An optimum that nothing requires | (none found) | Optional mastery keeps a game relaxed |
| Slay the Spire | Balance from logged choices; a difficulty ladder | Metrics that misled | Measure, and distrust a single number |
| Victoria 3 | A deep economy that is engaging to watch grow | Hidden causes; spirals players couldn't diagnose | Depth without legibility frustrates |
| SimCity (2013) | Visible individual agents | Their rules looked absurd up close | Visible agents must behave sensibly |
| Idle games | Cost curves; automation; unfolding | Hollow when numbers are the only reward | Borrow the pacing math and leave the timers |
| Kairosoft games, Restaurant City, Thrillville | Short loops; watching your place run; playing inside what you built | Evidence here is community opinion only | Needs a proper teardown |

---

## 15. What our own development has shown

Findings from building games ourselves. These are the strongest evidence in this file, because we saw them happen.

### Squeeze City, first playtest and audit, 2026-10-09

1. **Passing pacing targets says nothing about whether choices matter.** The build passed 10 of 10 balance targets. A player who never changed recipe or price earned 98% as much as one who played well.
2. **An upgrade is worth nothing where its problem doesn't exist.** With 1% of customers leaving the line, serving-speed upgrades took 281 and 864 days to pay back. Where 7% left, the same upgrades paid back in 11 and 21 days.
3. **A description of a benefit is not feedback.** The player read what each upgrade did and still couldn't tell whether it helped.
4. **Cash thresholds as the only goals produce waiting.** 82% of days had nothing to buy or unlock, and the player skipped them.
5. **A new place needs a visible reason to exist.** The first location unlocked earned less than the starting one, and the player didn't see the point of expanding.
6. **Staff and marketing priced without checking them lose money.** Every staff role lost money at three locations tested.
7. **Order of work matters.** Make purchases worth buying before building displays that show their worth. Otherwise the display honestly reports that they are worthless.

### Squeeze City, design review and experiments, 2026-10-09

8. **A gate on cash in hand punishes spending.** Locations unlocked when the player held enough cash. With cheaper upgrades, a bot that bought more of them unlocked the next location on day 26, where it had been day 17. Count what has been earned.
9. **Cheaper purchases do not fill quiet days.** Days with nothing to buy or unlock stayed at 79% after every price was cut. A game with about ten things to buy needs goals to fill the time between them.
10. **Some purchases cannot be fixed with numbers.** Storage upgrades and one staff role fixed problems the game did not have. No price made them worth buying. They came off sale until redesigned.
11. **A simulation may already support twin-day comparison.** Ours drew the same four random numbers per passer-by whether or not they stopped. A one-day test showed identical arrivals with and without each purchase. Only purchases that change how many people arrive broke it.
12. **Test a limitation before writing it down.** We recorded that the engine could not do the comparison in point 11 without reading the code. A ten-minute test showed it could.

### Squeeze City, second playtest and v2 research, 2026-10-10

13. **Fixing an economy cannot create decisions the core loop lacks.** Purchases were made to pay back and their effects were shown. The second playtest still "got mundane really quick": the recipe never changed and 83% of days were skipped. Design the daily decision first.
14. **Explaining after the fact works; explaining before in the model's terms does not.** A report card showing a hire losing $13 a day led the player to fire him. A projection built from multipliers was opened twice and never again.
15. **A number with no reference point gets set wrong.** The player priced at about half the best price for 23 days and nothing told him. Games that show a customer's reaction at the price tag (Moonlighter, Recettear) make a low price visible at once. `[E]`
16. **Every hidden, fixed target gets found and shared.** In this research pass that held for Lemonade Tycoon 2's recipe, Kairosoft's perfect dish, Moonlighter's price multiplier and Schedule I's best mix. What stayed interesting moved for a reason the player could see. `[E]`
17. **A penalty and a bonus can be the same arithmetic and feel opposite.** The research recommended a penalty for repeating a dish. The player rejected it as a chore and asked for a reward for trying something new. Start from a baseline where doing nothing new is fine.
18. **Older businesses become homework unless they can be handed off.** Big Ambitions' reviews say so in those words. `[E]` The player asked for the same thing unprompted: decisions that become automatic "as the game progresses and priorities change". Cap what a stage asks for, and offer a hand-off with each new decision.
19. **Real-world margins make poor game rewards.** A real food truck nets less per day than a busy cart might. Take the order of the climb and the kinds of cost from life, and let game money grow faster.
20. **A paper model tuned until it passes proves the numbers are consistent and nothing more.** Ours passed 17 of 17 checks after several rounds of tuning. It says nothing about fun.

Each game's own detail lives in its `docs/learning/LESSONS.md`.

---

## 16. Open questions, disagreements and retired findings

### Open questions

1. How much math should a management game show by default before it feels like a spreadsheet?
2. Does a twin-day comparison feel trustworthy to players, or confusing? No commercial example was found.
3. What keeps an endless sandbox worth returning to after the main unlocks are done?
4. Is choosing a spot within a location a lasting decision, or one solved on the first day?
5. What should staff be for, beyond a percentage?
6. How short can a simulated phase be and still leave room for a meaningful choice during it?
7. What do Kairosoft games, Restaurant City and Thrillville do mechanically? Our evidence on them is thin.

### Where our sources disagree

- **Payback time for upgrades**: 2 to 12 days in one pass, 5 to 30 in the other (section 6.3).
- **Which player motivation is most stable with age**: Quantic Foundry's own materials name two different ones.
- **Juice**: one well-known talk argues for more, a counter-talk argues it can cost immersion.

### Retired findings

None yet. A finding contradicted twice by our own development moves here with the reason.

---

## 17. Sources

### Read or watch first

1. Hunicke, LeBlanc and Zubek, "MDA: A Formal Approach to Game Design and Game Research" (2004): <https://users.cs.northwestern.edu/~hunicke/MDA.pdf>
2. Sid Meier, "Interesting Decisions" (GDC 2012)
3. Soren Johnson, "Water Finds a Crack" (2011) and his GDC 2022 retrospective
4. Anthony Pecorella, "The Math of Idle Games", parts I to III: <https://blog.kongregate.com/the-math-of-idle-games-part-iii/amp/>
5. Anthony Giovannetti, "Slay the Spire: Metrics Driven Design and Balance" (GDC 2019): <https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder>
6. Jaffe et al., "Evaluating Competitive Game Balance with Restricted Play" (AIIDE 2012): <https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf>
7. Dormans, "Simulating Mechanics to Study Emergence in Games" (2011): <https://ojs.aaai.org/index.php/AIIDE/article/download/12477/12336>
8. Factorio Friday Facts #426 (tooltips) and #36, #47, #52, #55 (determinism): <https://www.factorio.com/blog/post/fff-426>
9. Project Horseshoe, "Coziness in Games" (2017): <https://www.projecthorseshoe.com/reports/featured/ph17r3.htm>
10. Colossal Order on traffic in Cities: Skylines: <https://www.gamedeveloper.com/design/game-design-deep-dive-traffic-systems-in-i-cities-skylines-i->
11. Jonasson and Purho, "Juice It or Lose It" (2012): <https://www.gdcvault.com/play/1016487/juice-it-or-lose>
12. Glenn Fiedler, "Fix Your Timestep!"
13. Robert Nystrom, *Game Programming Patterns* (free online): Command, Game Loop, Update Method

### Books

- Schell, *The Art of Game Design*
- Adams and Dormans, *Game Mechanics: Advanced Game Design*
- Koster, *A Theory of Fun for Game Design*
- Swink, *Game Feel*
- Sylvester, *Designing Games*
- Costikyan, *Uncertainty in Games*

### Studies and models

- Ryan, Rigby and Przybylski (2006), the PENS model: <https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/>
- Holmgård, Green, Liapis and Togelius (2018), persona agents: <https://arxiv.org/pdf/1802.06881v1>
- de Mesentier Silva, Lee, Togelius and Nealen (2017), AI playtesting of a board game: <http://www.nealen.net/papers/3102071.3102105.pdf>
- Gudmundsson et al. (2018), human-like playtesting: <https://gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf>
- Desurvire, Caplan and Toth (2004), heuristics for playability
- Quantic Foundry, Gamer Motivation Model: <https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf>
- "Playing to Wait: A Taxonomy of Idle Games" (CHI 2018): <https://dl.acm.org/doi/10.1145/3173574.3174195>

### Documented player behavior

- Game Dev Tycoon wiki, Success Guide and Review Algorithm: <https://gamedevtycoon.fandom.com/wiki/Success_Guide>
- Lemonade Tycoon recipe and cheat pages: <https://www.cheatbook.de/files/lemonadetycoon.htm>
- RollerCoaster Tycoon guest thoughts: <https://rct.wiki/wiki/Ride/Attraction_Customer_Information>
- Chris Sawyer interview: <https://www.arcadeattack.co.uk/chris-sawyer-interview/>

### Caveats on the evidence

- Most sources describe hit games. A developer's account of why their game succeeded is weak evidence.
- Evidence of failure comes mostly from reviews and forums, which over-represent frustrated players.
- Almost every number in this file is our own proposal.
- Examples marked † were not re-checked.
- Findings from a single playtester point in a direction and nothing more.

---

## 18. Changelog

| Date | Change |
|---|---|
| 2026-10-10 | Added findings 13 to 20 in section 15 from Squeeze City's second playtest, the v2 research pass and the player's reaction to it. The research itself is in `BRIEF-v2.md`. |
| 2026-10-09 | Added findings 8 to 12 in section 15 from Squeeze City's design review and experiments. Corrected section 4.4 on what a twin-day comparison needs. Extended failure 21. |
| 2026-10-09 | File created from two research passes (design fundamentals and failure modes; a catalog of proven elements and how to show purchase effects) and from Squeeze City's first playtest and decision audit. |
