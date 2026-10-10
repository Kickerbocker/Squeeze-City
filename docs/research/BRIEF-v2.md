# Research brief for v2

Written 2026-10-10. It condenses a research pass on games like the one Benjamin described, how people really start food businesses, food trends, and art and music options. The design that came out of it is `docs/GDD-v2.md`.

Tags: `[E]` evidenced (a developer statement, a study, official documentation, or documented player behavior), `[X]` expert or critic opinion, `[P]` our own proposal. A dagger (†) marks something not checked against a source in this pass.

## 1. What changed after Benjamin read the findings

The research's main recommendation was a menu that loses appeal when repeated, borrowed from Cook, Serve, Delicious!. Benjamin rejected it the same day:

> "The penalty for old recipes is too hard… you would want the player to feel rewarded rather than make it an absolute chore to constantly innovate. Don't penalize but rather incentivize."

> "Make sure it's a good balance for all of it so you don't have to constantly think about it all the time where it becomes mundane and tedious… Eventually, it should be automated somehow through skill trees or upgrades as the game progresses and priorities change."

So the design keeps the research's diagnosis and changes its cure:

| Research said | Design does |
|---|---|
| Fixed recipes get solved and then ignored, in every game studied | Agreed. The daily thinking moves off the recipe and onto how much to make, what to charge and where to be. |
| Penalize repeating a dish | Dropped. Dishes get better with use, and new recipes are a bonus when a season, trend or skill makes them timely. |
| Older businesses become homework (Big Ambitions) | Each decision can be handed off through a skill or a hire, and no stage asks for more than three decisions. |

## 2. What other games teach

Failures first, because a guide that says "always do X" is proof a decision was solved.

| Game | How it failed | What to borrow | Tag |
|---|---|---|---|
| **Lemonade Tycoon 2** | Recipes were solved and posted ("7 lemons, 4 sugar, ice by temperature"). Reviews call it fun for a day. An empty recipe still sold. | Locations that differ in ways the player can see: a cheap quiet permit against an expensive busy one. | E |
| **Restaurant City** | Unlocking a recipe changed almost nothing in play. A dish needed 30 to 40 ingredients to max while the game gave 1 to 3 a day, so progress meant recruiting friends. | Dish levels as a source of pride; a small daily market of ingredients; a room you laid out, running itself while you watch. Service was fully automatic, and the player chose layout, decor, menu and staff. | E/X |
| **Kairosoft (Cafeteria Nipponica)** | Dish development was solved: fan guides give the ingredients for a perfect dish, and say compatibility "is not important at all". | Overnight recipe development by staff; sourcing trips on a calendar; a whole shop visible on one screen. | E |
| **Cook, Serve, Delicious!** | Skilled players hit the customer cap within about a dozen shifts and then played badly on purpose to cope. Players called menu rot unrealistic. | Boosters tied to weather and time of day; staple dishes that are always safe. Rot itself is not borrowed. | E |
| **PlateUp!** | A trophy guide says to "always pick the card that reduces customers by 15%". | A choice between two rule changes every few days, where each has a real upside and a real cost. | E |
| **Big Ambitions** | Steam reviews: micromanagement is "a net drag… past your first business"; it "feels like homework"; players press "sleep 24 hours" over and over once things run themselves. | Odd jobs as a beginning; a readout of what is capping customers today. Its main lesson is what to avoid. | E |
| **Recettear, Moonlighter** | Both were solved by formula (Moonlighter: base price × 1.1, with posted tables). | Customers show a face at the price tag, so a price that is too low is visible before money is lost. This is exactly what Playtest 2 lacked. | E |
| **Schedule I** (mechanics only) | Players report that selling the single most profitable mix "and nothing else is absolutely the way to go". | Neighborhoods that prefer different things; regulars who warm up over time and can then be handed to staff. | E |
| Good Pizza, Great Pizza † | Not checked | Requests phrased as small riddles; regulars with stories | † |
| Dave the Diver † | Not checked | A menu limited by what you have today | † |
| Stardew Valley † | Not checked | Earlier assets feed later ones; skills earned by doing | † |
| Supermarket Simulator and similar † | Restocking becomes a chore at scale | A market price shown beside the price you set | † |
| Idle food games † | Timers, ad boosts, capped offline earnings | Managers who run earlier tiers | † |

**The pattern across all of them** `[E]`: every hidden, fixed target was found and shared. What stayed interesting was a target that moves for a reason the player can see (weather, a crowd, a calendar) and choices the player authors.

Most sources are fans and guides for games that kept an audience, so this probably understates how often these ideas fail.

## 3. What makes a day worth a decision

Candidates ranked by the research, with what the design did with each.

| System | Evidence | In the design |
|---|---|---|
| How much to make against a forecast | Standard operations theory (the newsvendor problem); Playtest 2's unseen sell-outs | The first decision, from the market table |
| Price by reading faces | Moonlighter, Recettear `[E]` | The second decision, from the drink stand |
| Where to be today | Lemonade Tycoon 2's permits; Schedule I's neighborhoods `[E]` | From the cart |
| A board of requests | Recettear's advance orders `[E]` | From the contracts stage |
| Trends that rise and fade | Datassential's adoption cycle `[E]` | A reason to add a recipe, never a requirement |
| A choice of two rule changes every few days | PlateUp! `[E]` | Held for later; a candidate for weekly events |
| An hours budget for the owner | Stardew, Big Ambitions † | Only at the gig stage, as a simple choice |
| A menu that tires | Cook, Serve, Delicious! `[E]` | Rejected by Benjamin |

**Keeping a planning-first day worth watching** `[P]`, drawing on Restaurant City's diorama and Moonlighter's faces: show reactions at the price tag; put up a sold-out sign with the time; slow down for three labelled moments; have the report refer back to them; show them as stills when the day was skipped.

## 4. How people really start food businesses

**Tennessee** `[E]`: the Food Freedom Act (HB 813, in effect July 2022; expanded by HB 130 in July 2025) lets people sell non-perishable home-made food with no state permit, no inspection and no sales cap. A home kitchen and a market table is a realistic first business for a Nashville-like setting.

| Stage | Startup cost | What it earns | Source quality |
|---|---|---|---|
| Gig work | $0 to $500 † | Hourly pay † | Not sourced |
| Home kitchen, market booth | Low † | Uncapped by law | Law: E. Money: not sourced |
| Vending machine | $500 to $3,500 new; $150 to $300 of stock | $150 to $400 a month gross; about $40 to $120 net; the location takes 10% to 25%; restock once or twice a week | Vendor blogs, weak |
| Pushcart | Less than a truck † | | Not sourced |
| Food truck | $50,000 to $250,000 all in; a used truck $20,000 to $60,000 | About $250,000 to $500,000 a year in sales; net around 6% to 10%, though sources range from 3% to 20% | Industry blogs, weak and conflicting |
| Quick-service restaurant | High † | Food about 32% of sales, labor about 32%, occupancy about 5% (2024 medians) | Trade association figures, cited secondhand |
| Full-service restaurant | Higher † | Food about 32%, labor about 37% (34% at profitable places, 43% at loss-makers), occupancy about 6% | Same |

**Restaurants do not fail at 90% in the first year** `[E]`. One study of Columbus, Ohio found 26% failed in year one and about 60% by year three (Parsa and others, 2005). A study of 81,000 full-service restaurants in eight western states found 17% failed in year one, slightly fewer than other service businesses (Luo and Stark, 2014).

**Why small food businesses fail** `[X]`: thin margins, cash running out before bills, a poor location, rent, expanding too soon, waste, and labor costs creeping up.

**How the game uses this:** the order of the ladder and the kinds of cost at each stage follow real life. The dollar figures do not. Real margins would make a food truck earn less per day than a busy cart, which is no reward for climbing, so game dollars grow faster than real ones.

**Three ladders were compared:**

| Ladder | Order | Verdict |
|---|---|---|
| Street to storefront | Gigs → home kitchen and market → drink stand, with vending alongside → cart → truck → contracts → restaurant → second location | **Chosen.** Matches how people start in Tennessee, gives one new decision per stage, and keeps lemonade as the first stand. |
| Kitchen first | Home kitchen → market → delivery-only kitchen → catering → packaged goods → café | Strong on recipes; little street life to watch |
| Lemonade legacy | Stand → more stands → kiosk → truck → juice bar → restaurant | Most nostalgic; a narrow product range, and the likeliest to go flat the way Lemonade Tycoon 2 did |

## 5. Food trends

- `[E]` Datassential describes four stages: a trend begins in adventurous independent restaurants, is adopted more widely, spreads to mainstream menus, and ends up everywhere.
- `[E]` Its analysts say the cycle has shortened to roughly six to eight years, from about twelve.
- `[E]` Datassential's CEO said Nashville hot chicken was flagged in 2014 and reached "everywhere" on Southern menus in 2025, an eleven-year arc that suits the setting.
- `[E]` Old items come back when someone presents them in a new way.
- † Timelines for other well-known trends (cronuts, birria, boba and so on) were not checked.

In the game a trend runs 20 to 40 days `[P]`, so the player sees several rise and fade.

## 6. Art

Benjamin accepts both free (CC0) packs and AI-generated art in one style.

| Route | What it is | Cost | Risk |
|---|---|---|---|
| A. Free 3D kits rendered to 2D | Kenney's kits (food, city buildings, roads, animated small characters, a mini market) rendered from one fixed camera. All are CC0 with no attribution needed `[E]`. | $0, plus learning one render script | No carts, trucks or stand details in the kits; characters look generic |
| B. AI-generated only | Sprite tools such as PixelLab, or general image models | About $10 to $25 a month for one to three months | Style drift between images; inconsistent angles; animation frames; cleanup. Tool claims come from vendor blogs. |
| **C. Both (recommended)** | Route A for buildings, vehicles and people; AI for food icons, signs and decoration; one palette and one outline rule over everything | $0 to $25 a month | Moderate. Consistency comes from the shared camera, palette and outline. |

What the reference games looked like, from memory and not checked †: Lemonade Tycoon 2 had a three-quarter street view, a bright summer palette and many distinct customer shapes. Restaurant City had a room seen at an angle with big-headed characters. Kairosoft shows a whole shop on one screen with constant small movement.

## 7. Music

**Why the generated music sounded ominous** `[X]`: the scales used have a minor or unresolved colour, and generated music tends to hold one note under slow, echoing pads with no clear ending to its phrases. All of those read as suspense.

**What reads as relaxed and upbeat** `[X]`: a major key, about 100 to 130 beats a minute, a light swing or bossa rhythm, short tunes that resolve, and bright instruments such as ukulele, marimba, plucked strings, whistling and brushed drums.

| Route | Terms | Risk |
|---|---|---|
| A. Free libraries | Kenney audio is CC0. Kevin MacLeod's incompetech is CC BY and needs a credit. Freesound varies by sound. `[E]` | Tracks may not loop cleanly or match each other |
| B. AI music | Suno's free tier is personal and non-commercial, and Suno keeps ownership. **Udio is unusable: downloads have been disabled since its October 2025 settlement.** `[E]` | Quality varies; terms keep changing |
| **C. Layered loops (recommended), using A's material** | Three or four layers per theme, started together and faded in and out with the time of day and how busy it is | Getting loops to line up; sound must be unlocked by a tap on phones |

Nothing is composed until Benjamin names one or two reference tracks.

## 8. Limits of this research

- Vending and food-truck figures come from blogs with something to sell, and they disagree. Use them as ranges.
- Many stages (gigs, carts, catering, wholesale) and several games were not checked this pass. They are marked †.
- Restaurant cost figures are cited secondhand.
- AI tool terms changed during 2025 and 2026 and may change again.
- No source can say whether any of this is fun for Benjamin. The prototype does that.

## 9. Sources

**Games**

- Cook, Serve, Delicious! boosters and detractors: <https://cookservedelicious.fandom.com/wiki/Boosters_%26_Detractors>
- Recettear pricing: <https://recettear.fandom.com/wiki/Pricing_Mechanics>
- Moonlighter price guide: <https://allthings.how/moonlighter-price-guide-perfect-selling-prices-for-every-item/>
- Restaurant City wiki: <https://restaurantcity.fandom.com/wiki/Restaurant_City> and a critique: <http://citystate.co.uk/archives/restaurant-city/>
- Cafeteria Nipponica ingredients: <https://kairosoft.wiki.gg/wiki/Ingredients_(Cafeteria_Nipponica)>
- Lemonade Tycoon 2 user reviews: <https://www.gamespot.com/lemonade-tycoon-2-new-york-edition/user-reviews/2200-504666/>
- PlateUp! trophy guide: <https://psnprofiles.com/guide/22431-plateup-trophy-guide>
- Big Ambitions Steam reviews: <https://steamcommunity.com/app/1331550/reviews/>

**The real world**

- Tennessee home-food law by state: <https://cottagecms.com/state-laws>
- Parsa and others, "Why Restaurants Fail": <https://www.researchgate.net/publication/237835565_Why_Restaurants_Fail>
- Datassential on trend lifecycles: <https://datassential.com/resource/understanding-trend-lifecycles/>
- Vending machine profit (vendor blog): <https://www.vendsoft.com/vending-machine-profit/>
- Food truck costs (industry blog): <https://www.restroworks.com/blog/food-truck-cost/>

**Art and music**

- Kenney food kit: <https://kenney.nl/assets/food-kit>, mini characters: <https://kenney.nl/assets/mini-characters>, licence: <https://kenney.nl/support>
- incompetech licence: <https://incompetech.com/music/royalty-free/faq.html>
- Freesound licences: <https://freesound.org/help/faq/>
