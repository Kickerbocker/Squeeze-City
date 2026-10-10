# Playtest notes

Add a new section per session (newest at the top). These notes feed the M8+ balance loop.

## Session 2026-10-10 (Playtest 2, game days 1–23, build after PRs #3–#6)
Play log: `docs/playtests/2026-10-10-playtest2-seed1160044776-day24.json` (`npm run playlog -- <file>`).

Benjamin's notes, in his words:
- "The math didn't make sense much. Not sure what any of show the math worked or helped at all. Is it per customer or something? It didn't make much sense."
- "The music felt more ominous than relaxing. It should be a relaxing but upbeat and fun melody."
- "The visuals should be way more appealing, similar to lemonade tycoon 2."
- "I feel like the game didn't really change much day by day. Not much thinking or problem solving, and got mundane really quick."
- "Maybe add some more game elements from the other referenced games such as restaurant city. Maybe add what other things a lemonade stand can add eventually. Or maybe even own a restaurant eventually?"
- "Start off as someone who want to hustle and start off small. Do small gigs, gain skills, build and earn money, buy other things that make money like vending machines or other side hustles all in the food space as a individual entrepreneur who only wants to work for him/herself. Eventually a lemonade stand, then food stand, then food truck, restaurant, etc. with more curation of food recipes, finding trends or new taste palettes and or add new things to sell."
- "It's time to pick it up substantially. Much more research and development."

What the play log shows (23 days in 14 minutes):
- Skipped 19 of 23 days (83%), median at 9:22 AM. Watching had no value.
- Recipe set once on day 1 (4/4/3) and never changed. Price changed on 2 days, ending $0.50–$0.65, about half the best price (~$1.05–$1.40). Only 4% of those who stopped said "too expensive", and the game never pointed that out.
- 74% of mornings only bought stock; median planning time 14 seconds.
- 83% of days had nothing bought or unlocked (longest run 7 days).
- Sold out on 4 days, turning away up to 208 people in a day, mostly on days he had skipped.
- Hired a Promoter on day 8; the report showed it losing ~$13 a day; fired on day 18. The after-the-fact report worked; the before-buying projection did not prevent the hire.
- Unlocked Uptown on day 10 and never moved there (Map tab opened on 13% of days).
- "Show the math" opened on days 1–2 only (5 times), then never.
- Net worth $114 → $303 over 23 days.

## Session 2026-10-09 (first playtest, build 0f818cf)
Benjamin's notes:
- Bored when the recipe got monotonous.
- Little incentive to buy any upgrades or staff.
- Had to hoard money to reach the next stage, which meant skipping a lot of days.
- Upgrade, hiring and marketing descriptions named a benefit, but he couldn't tell how much they helped after buying. It felt like buying them just meant hoarding longer.
- Didn't understand the purpose of buying multiple parts of the map, or what makes one better.

What `npm run audit` shows for the same build (20 seeds):
- Never changing recipe or price earns 98% of Sensible play at Maple Park (96% at Campus Quad, 94% at Financial District).
- No upgrade pays back within 30 days at Maple Park. The best, the Stall, takes 50. Cooler, Umbrella and Fridge never pay back.
- Every staff role loses $43 to $64 a day at all three locations tested.
- Every marketing campaign loses money at Maple Park and Campus Quad.
- 82% of days have nothing to buy or unlock. The longest quiet stretch is a median 32 days.
- Uptown Blocks, the first unlock, earns $51 a day against Maple Park's $82.

<!--
## Session YYYY-MM-DD (game days X–Y)
- Felt too easy/hard: …
- Confusing UI: …
- Dominant strategy I found: …
- Specific numbers that felt wrong (e.g. "lemons never run out at $0.30"): …
- Bugs: …
-->
