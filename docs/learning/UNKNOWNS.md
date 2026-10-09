# Known unknowns

Questions we can't answer yet, and how each could be answered. Review at the end of every milestone. Anything open for two milestones gets a test or is marked "won't know".

| # | Opened | Question | Why it matters | How to find out |
|---|---|---|---|---|
| U1 | 2026-10-09 | Are the audit thresholds right (85% lazy play, 30-day payback, 60% quiet days)? | They are our guesses. If they are wrong the audit passes boring builds or fails fun ones. | Compare audit results with the player's verdict over the next three playtests. |
| U2 | 2026-10-09 | How much math should be shown by default, and how much on request? | Benjamin answered the first half on 2026-10-09: show the math, or at least a before-and-after comparison for upgrades. What remains is how much detail fits a phone screen without feeling like a spreadsheet. | Research how other games show purchase effects; then test one upgrade card each way. |
| U3 | 2026-10-09 | Does a 1-minute day leave room for mid-day decisions without feeling rushed? | The player wants calm and cozy, a 1-minute day, and a reason not to skip. These pull against each other. | Prototype the day with two decision moments and playtest at 1 minute and 2 minutes. |
| U4 | 2026-10-09 | What keeps an endless sandbox worth returning to? | The player wants no final win but does want incentives. | Tear down how RollerCoaster Tycoon scenarios, Kairosoft and Restaurant City handle long-term goals. |
| U5 | 2026-10-09 | Is choosing a spot within a location fun, or one more setting to get right once? | The player asked for stand placement by foot traffic. A fixed best spot would be solved on day one. | Research how Lemonade Tycoon and other games vary traffic over time; add a never-moves bot. |
| U6 | 2026-10-09 | What should staff be for? | At current wages no role pays. Cheaper staff may just become a mandatory purchase. | Design pass on staff as a tradeoff, then the audit. |
| U7 | 2026-10-09 | Which of our problems would an experienced designer spot that we haven't? | Neither of us has built a game before. | One teardown per milestone; log every playtest surprise here. |
| U8 | 2026-10-09 | Can the sim replay a day without one purchase and give an honest difference? | A "same day without it" comparison is the proposed way to show what a purchase did. Today each location draws all its customers from one random stream (`dayRng(seed, day, STREAM.customers, location)` in `src/sim/day.ts`), so removing an item would shift every later customer's luck. | Give each customer their own stream; test that an item with no effect shows a difference of exactly zero. |
| U9 | 2026-10-09 | How long should an upgrade take to pay for itself? | Two research passes gave different ranges (2 to 12 days, and 5 to 30). The audit uses 30. | Tune toward the overlap, then ask after a playtest which purchases felt worth it. |

