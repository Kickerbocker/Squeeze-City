# Design principles

The rules Squeeze City has adopted. The wider reference these are drawn from, which applies to any game, is `KNOWLEDGE.md` in this folder.

Rules we have adopted, each one checkable. Tags: `[E]` evidenced, `[X]` expert opinion, `[P]` our own proposal, to be checked by the audit and by playtests. Add a rule only with a tag and a source. Remove a rule that has been contradicted twice (see `docs/learning/LESSONS.md`).

## Decisions

1. `[X]` A decision is interesting when it is informed, has a tradeoff, suits more than one play style and gets feedback. (Sid Meier, "Interesting Decisions", GDC 2012)
2. `[X]` Something interesting to do once is not interesting to do ten times. A repeated decision needs a best answer that changes with the situation. (Meier, same talk)
3. `[X]` Players will optimize the fun out of a game if it lets them. Assume the most efficient strategy will be found and repeated, and check that it is fun. (Soren Johnson, 2011)
4. `[E]` A static formula gets solved. Lemonade Tycoon had a recipe that worked in any weather and an empty-cup exploit; Game Dev Tycoon had fixed slider settings that carried a whole game. (Player-written guides for both)
5. `[E]` Removing an option and measuring how little the player loses finds false choices. (Jaffe et al., "Evaluating Competitive Game Balance with Restricted Play", AIIDE 2012)

## Feedback

6. `[E]` Show the cause of every result. RollerCoaster Tycoon's guest thoughts are the model: the player reads why guests are unhappy from the guests themselves. (Chris Sawyer interviews)
7. `[E]` Visible agents with simple rules get caught looking stupid. SimCity (2013) simulated individual citizens who walked to the nearest open job each day. Customers with thought bubbles must behave sensibly when watched.
8. `[X]` Polish (animation, sound, particles) multiplies good feedback and cannot replace a missing decision. ("Juice It or Lose It", GDC Europe 2012)

## Economy

9. `[E]` Simulating many games with scripted strategies finds dominant strategies before players do. In one model, turtling won 997 of 1,000 games until one cost changed. (Dormans, "Simulating Mechanics to Study Emergence in Games", 2011)
10. `[E]` Costs should grow faster than the income they add, so each purchase stays a decision. (Pecorella, "The Math of Idle Games", 2016)
11. `[P]` An upgrade should pay for itself within 30 days at the point where it becomes affordable.
12. `[P]` A player who never changes recipe or price should earn at most 85% of a player who adapts.
13. `[P]` At most 60% of days should pass with nothing to buy or unlock, and no quiet stretch should run past 10 days.

## The day itself

14. `[E]` A watched simulation needs levers. Football Manager brought back touchline shouts in an update after shipping a version without them.
15. `[P]` Skipping the day should give a good result, around 90% of an attentive one. Watching is rewarded; skipping is never punished.
16. `[E]` Slow pacing is the most common complaint about Kingdom Rush's wave phase. Keep speed controls.

## Testing

17. `[E]` Bots find structural problems such as dominant strategies and dead options. They cannot measure fun; every paper on automated playtesting says so. The player's verdict is final.
18. `[E]` Passing pacing targets says nothing about whether choices matter. This game passed 10 of 10 balance targets while failing 6 of 6 audit checks. (Our own audit, 2026-10-09)

## Purchases and feedback

19. `[E]` Show a purchase's effect where the decision is made, and name the cause along with the number. (Factorio Friday Facts #426; Path of Exile 2's node preview; RollerCoaster Tycoon guest thoughts)
20. `[E]` A flat percentage with no baseline is not feedback. (Jurassic World Evolution players could not tell whether upgrades stack; our playtest, 2026-10-09)
21. `[P]` The problem an upgrade fixes should be present on at least a quarter of days at the point where the upgrade becomes affordable.
22. `[P]` Make purchases worth buying before building the displays that show their worth. Built first, the displays would report that purchases are useless.
23. `[X]` Threat and pressure cancel a cozy tone, so failure has to be slow, announced in advance and recoverable. (Project Horseshoe, "Coziness in Games", 2017)
24. `[E]` A gate on progress counts what the player has earned, never the cash they are holding. Gates on cash in hand punish spending. (Our own experiment and playtest, 2026-10-09: cheaper upgrades delayed the Campus Quad unlock from day 17 to day 26)
