# Squeeze City v2: design draft

**Status: approved by Benjamin on 2026-10-10** ("go ahead, get as far as you can without me"). P1 is being built from it. Written 2026-10-10 from his direction, Playtest 2's play log, and the research in `docs/research/BRIEF-v2.md`. Until this is approved, `docs/GDD.md` (v1.1) still describes the game that exists.

Every number is a starting value. They live in `scripts/paper-economy-v2.mjs` and are checked with `npm run paper`.

## 1. The fantasy

You are a food hustler in a warm, cartoon Southern city. You start with a bike, a phone and a home kitchen, and you only ever work for yourself. Each business you start becomes a small machine you tune, hand to someone you trust, and keep. Years later the city is dotted with things you built.

## 2. Pillars

1. **Every morning has a real choice.** Something the player can see is different today: the weather, the crowd, an event, a request, a trend.
2. **Watching teaches.** The day shows things worth reading: faces at the price tag, the line, a sold-out sign going up. The evening report refers back to them.
3. **Never more than three things to think about.** Each stage has at most three decisions that need the player. When a new one arrives, an older one can be handed off.
4. **Reward, never nag.** A menu the player never changes is always a sound business. New recipes, moves and specials are a bonus for the player who wants them.
5. **Nothing built is abandoned.** Earlier businesses keep earning with someone else running them, and what was learned there carries forward.
6. **Honest money, gentle pace.** Bills are real and going broke is possible, but it is always announced days ahead with ways out. There are no timers outside the one-minute day.

## 3. Attention and handing off

Playtest 2 went flat because nothing asked for thought. The opposite failure is a game that asks for thought about everything, every day. This section is the guard against both.

**Each decision is in one of three states:**

| State | What it means | How the player gets it |
|---|---|---|
| Yours | You choose each morning. | The default when a decision first appears |
| Helped | The game suggests an answer in plain words ("Make about 210 today"). One tap accepts it. | A skill |
| Handed off | It runs without you, at a little under what careful play earns. You can take it back at any time. | A later skill, or hiring someone |

**Rules:**

- A stage never has more than three decisions that are Yours.
- Every new stage brings one new decision and, at the same moment, offers to hand off the oldest one.
- A handed-off decision earns 85% to 96% of what careful play earns. It is good enough to forget about, and still worth taking back on a day that matters.
- Nothing is handed off before the player has done it by hand for a while. Automation that arrives too early removes the game.

**What needs the player at each stage:**

| Stage | Yours | Helped or handed off by then |
|---|---|---|
| Gigs | Which gig today | |
| Market table | How much to make | |
| Drink stand | How much to make; what to charge | |
| Food cart | Where to set up; the special; what to charge | How much to make |
| Food truck | The route; events; the special | Price; quantity; the stand |
| Contracts | Which jobs to take; the route; events | The special; the cart |
| Restaurant | The seasonal menu; staff; which jobs to take | The route; the truck |
| Second location | Who runs what; the seasonal menu; staff | Jobs; day-to-day at each place |

## 4. The ladder

Each stage adds one new kind of decision. The order follows how people really start food businesses in Tennessee, where home-made food can be sold with no permit.

| # | Stage | The new decision | What is new to look at | Unlocks at (money earned) | Costs | Weekly bills |
|---|---|---|---|---|---|---|
| 1 | Gigs | Which gig to take with today's hours | You, working around the city | start | $0 | $0 |
| 2 | Market table | How much to bake for market day | A booth, a crowd, a sold-out sign | $120 | $90 | $0 |
| 3 | Drink stand | What to charge | Faces reacting at the price tag | $420 | $300 | $0 |
| | Vending machine (side earner) | Where to put it; a weekly restock choice | A machine in a place you chose | $900 | $280 each | $0 |
| 4 | Food cart | Where to set up today; an optional special | Neighborhoods with different crowds | $1,700 | $1,300 | $400 |
| 5 | Food truck | A route through the day; which events to work | A map with crowds moving through the day | $5,500 | $1,800 down | $3,200 |
| 6 | Contracts | Which catering and wholesale jobs to accept | A board of requests from named customers | $14,000 | $1,500 | $3,600 total |
| 7 | Restaurant | A seasonal menu; staff; the room | A dining room you laid out, running itself | $32,000 | $11,000 down | $11,000 |
| 8 | Second location | Who runs what | Two places at once | $85,000 | $28,000 down | $11,000 more |

- **Unlocks count money earned over the whole game**, never cash in hand. Spending on the business never delays an unlock.
- **Lemonade is the first thing the drink stand sells.** It stays on the menu for the whole game as one product among many.
- **In the paper model** a player who keeps a small reserve reaches the stand around day 7, the cart around day 23, the truck around day 43, a restaurant around day 65 and a second location around day 95. At about two minutes a day, that is a restaurant after roughly two hours of play.

**What carries forward:**

| From | It becomes |
|---|---|
| Gigs | Always available. A safe day's pay when money is tight, so the player can never be stuck. |
| Market table | Market days stay the best days of the week for the stand and the cart. Baked goods join the menu. |
| Drink stand | Someone you hire runs it. It earns about 65% of what you would. |
| Vending machines | A side earner for the whole game, with one small choice a week. |
| Food cart | A hired runner works it, or it parks at the truck's second-best spot. |
| Food truck | A crew runs the route you set. It also works your catering jobs. |
| Recipes and skills | Everything learned at any stage is kept. |

## 5. A day and a week

**A day**

1. **Morning board (about 30 to 60 seconds).** One screen shows what is different today and asks for the decisions that are Yours. Anything Helped shows its suggestion. Anything Handed off shows one line saying what it will do.
2. **The day (1 minute).** The place runs while the player watches. Speeds and Skip stay. Three moments are slowed and labelled as they happen, for example the first sell-out or a run of customers balking at the price.
3. **Evening report.** What was earned, what was missed, and one suggestion, all in the player's own numbers. If the day was skipped, the report shows the three moments as stills, so skipping costs information and never money.

**A week**

- Seven days. Saturday and Sunday are market days, with bigger crowds.
- Bills are due on day 7.
- One goal each week is within reach: a festival target, a regular's request, a best-day record.
- The week ends with a short summary, which is a natural place to stop playing.

## 6. The decisions

### How much to make (market table onward)

- **Rule:** the forecast gives a range ("180 to 260 people likely to want a drink"). The player picks a batch size. Unsold drinks keep half their value for tomorrow. Running out turns people away.
- **Behavior:** read the forecast, decide how much risk to take.
- **Feeling:** "I called it."
- **Seen during the day:** a SOLD OUT sign with the time, and a counter of people walking away.
- **In the report:** "You sold out at 1:40 pm. 62 people left. Making 60 more would have earned about $55."

### What to charge (drink stand onward)

- **Rule:** each street has a price most people expect, shown as a range ("lemonade here usually sells for $1.00 to $1.50"). It moves with the weather. Each customer shows one of four reactions at the price tag: "What a deal!", a smile, "Hmm, pricey", or walking off.
- **Behavior:** set a price, watch the faces, adjust tomorrow.
- **Feeling:** "I can read this crowd."
- **In the report:** "You charged $0.55. 48 of 60 customers thought it was a steal. At $1.20 you would have earned about $31 more."

Playtest 2 priced at half the best price for 23 days and the game never said so. This is the fix.

### Where to set up (food cart onward)

- **Rule:** three to five spots, each with a crowd the player can see before choosing: who is there, what they like, when it is busy, what a spot costs. Events move the crowds.
- **Behavior:** follow the crowd that suits today's menu and weather.
- **Feeling:** knowing the city.

### The special (food cart onward)

- **Rule:** one optional slot beside the regular menu. A recipe that is in season or on trend gets extra attention there. An empty slot costs nothing.
- **Feeling:** showing something off.

### Later decisions

- **The route (truck):** a spot for the morning, lunch and evening, plus a calendar of events worth planning a week around.
- **Which jobs to take (contracts):** two to four requests at a time from named customers, each with a deadline, a reward and what it will tie up. Taking everything should do worse than choosing.
- **The seasonal menu, staff and room (restaurant):** in the manner of Restaurant City. The player lays out the room, places staff, sets a menu of about six dishes, and watches it run.
- **Who runs what (second location):** which manager suits which place.

Each of these gets its own spec, written after the stage before it has been playtested.

## 7. Recipes

Recipes are an occasional pleasure. They are never a daily demand.

**Signature dishes get better with use.** Every dish has a mastery level from 1 to 5 that rises as it is sold. Each level does something the player can see: quicker to make, a little better, regulars who ask for it by name. A menu that never changes is always a sound business.

**New recipes arrive when something makes them timely:**

| Reason | What happens | How often |
|---|---|---|
| An ingredient is in season | It costs less and tastes better for a few weeks | Each of four 28-day seasons |
| A trend is rising | Being early draws a crowd. Later it becomes ordinary. | About three trends alive at a time, each lasting 20 to 40 days |
| A new skill | It opens a technique, such as frozen drinks or grilling | When the player spends a point on it |
| A new stage | Its own starting recipes | At each unlock |

**How often a change is worth making:**

| Stage | Menu | A change pays |
|---|---|---|
| Market table, drink stand | 1 to 3 items | Almost never. A product is added when it unlocks. |
| Food cart | A small menu and one special | When a season or trend suits |
| Food truck | Chosen from the recipe book to suit the route | Choosing among recipes already owned |
| Restaurant | About six dishes | A seasonal refresh every few weeks |

**Tastes are simple and visible.** Each neighborhood shows two or three things its crowd likes (sweet, cold, spicy, filling, cheap, fancy). A recipe shows what it is. Matching them is a glance, with nothing hidden to look up.

**Trends** follow the real pattern food trends follow: rising, peak, everywhere, fading. A trend that is "everywhere" stops being special and becomes something customers expect.

## 8. Skills

Skill points come from doing the work: money earned turns into experience, and each level gives a point. In the paper model that is about 22 points over 120 days.

Five branches. Each has perks, one fork where the player chooses a style, and the nodes that hand decisions off.

| Branch | Earned mostly by | Example perks | The fork | Hands off |
|---|---|---|---|---|
| Kitchen | Making and selling food | More recipe slots; faster mastery; new techniques | Comfort food or adventurous food | The special |
| Sales | Serving customers | Clearer reactions; a wider price people accept | Charm (people forgive a higher price) or Read (exact numbers on reactions) | Price |
| Logistics | Stock and travel | Less waste; more vending machines; quicker moves | Bulk or fresh | Quantity; the route |
| People | Hiring and regulars | Better hires; regulars who bring friends | Loyal crew or star hires | Whole businesses, through runners and managers |
| Money | Bills and deals | A credit line; insurance against a bad week; better loan terms | Safety or leverage | Which jobs to take |

Gigs teach the systems one at a time before the player owns anything: a delivery shift shows the neighborhoods, a market helper shift shows batch sizes, a catering shift shows requests.

## 9. Side earners

- **Vending machines.** Bought from the drink stand stage. The player picks the location and, once a week, what to stock. A sensible default is always filled in. Each pays for itself in about a month.
- **Businesses someone else runs.** They earn about 65% of what the player would, with the wage included.
- **Wholesale** (contracts stage): jars and baked goods sold through local shops.

In the paper model, things the player no longer runs bring in about a third of all income by day 120.

## 10. Money and going broke

- **Weekly bills** from the cart onward: permits, loan payments, rent, wages.
- **Bad stretches happen:** a week of storms, road works or a breakdown, sometimes two in a row.
- **Three days' warning** before a bill that can't be paid, in plain words with the options: "Truck payment of $3,200 is due in 3 days. You have $2,100. You could take gig shifts, sell a vending machine for $170, or borrow at 20%."
- **An emergency loan** covers one missed bill, at most once every four weeks.
- **If the bill still can't be paid, the business is lost.** You step down one stage and keep every skill and recipe (Benjamin's call, 2026-10-10).
- **In the paper model** a player who keeps one week of bills in reserve goes broke 2% of the time. A player who expands with no reserve goes broke 28% of the time.

## 11. How the game explains itself

Carried over from what Playtest 2 showed worked and what did not.

- Explanations are plain cause and effect in the player's own numbers. No multipliers.
- Explain after the fact. The report card that showed a hire losing $13 a day worked; the projection before buying did not.
- Always show what was missed: lost sales, a price that was too low, a crowd somewhere else.
- Show a reference point for every number the player sets: the street price, the forecast range.
- A purchase is offered when the problem it fixes is visible.

## 12. Look and sound

Benjamin has accepted both free (CC0) asset packs and AI-generated art in one consistent style.

- **Look, recommended:** render free 3D kits into 2D sprites from one fixed camera, so buildings, vehicles, food and people share an angle and lighting. Use AI-generated art for what the kits lack, such as food icons and signs, and pass everything through one palette and one outline rule.
- **Sound, recommended:** a few short major-key loops at a walking-to-jogging tempo, with bright instruments such as ukulele, marimba and plucked strings. Layers come in and out with the time of day and how busy the place is.
- **Needed from Benjamin before any music work:** one or two songs or game soundtracks that sound right to him.
- **Order of work:** the prototype is plain. Art and music start once the prototype has shown the days are worth playing.

## 13. What carries over from the current build

| Keep | Retire |
|---|---|
| The deterministic simulation core, seeded randomness, and values in config | The lemons, sugar and ice recipe as the centre of the game |
| Weather and forecast, customer types, the queue | The seven locations unlocked in a fixed order |
| Saves with migrations | The four ad campaigns and the upgrade list in their current form |
| Balance bots and the decision audit | The generated music |
| The play log | The before-buying projection with "show the math" |
| The "what your purchases did today" report card | |
| The one-minute day, speeds and Skip | |
| The street scene, as the plain look for the prototype | |

## 14. Decisions from Benjamin (2026-10-10)

1. **Direction:** approved. "Go ahead, get as far as you can without me."
2. **Going broke:** step down one stage and keep every skill and recipe.
3. **The city:** made up, with a Nashville feel.
4. **Music:** he agreed to give reference tracks. **Still needed:** the actual one or two song or soundtrack names. No music work until then.

Still open, and better answered after the prototype: whether rival vendors belong in the city, and whether the look should be pixel art, smooth cartoon or rendered 3D.

## 15. What the paper model does and does not show

`npm run paper` passes 17 of 17 checks with the numbers above.

- **It shows** that these numbers hang together: the stages arrive at a steady pace, there is something new to aim for at least every four days, a careful player is safe and a reckless one is not, and a handed-off stand earns 93% of careful play.
- **It does not show** that any of it is fun. Only the stand's two decisions are modelled in detail; later stages are income ranges.
- **One number to watch:** a player who ignores the forecast and never changes quantity or price earns 60% of careful play at the stand. That may be too harsh for a calm game. The prototype will tell.
- The numbers were tuned until the checks passed, so passing is a starting point for the build and proves nothing more.
