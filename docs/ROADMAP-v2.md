# Roadmap for v2

Status: draft, waiting for Benjamin to approve `docs/GDD-v2.md`. It replaces M11 to M16 in `docs/ROADMAP.md`.

## How this works

1. Each step is one Claude Code session, built from a spec in `docs/specs/`.
2. A playtest follows each prototype. Benjamin exports the play log and answers the step's questions.
3. The next spec is written in chat after that playtest. Only P1 has a spec now.
4. A prototype can end with "rework the design". That is a result, and it is cheaper there than later.

## The steps

| Step | What it adds | The problem it solves | The playtest question |
|---|---|---|---|
| **P1** | Gigs, market table, drink stand. Quantity and price, faces, "what you missed", the first hand-off. Plain look. | Days that don't differ and ask for no thought | Did you change your plan because of something you saw? |
| | **Playtest 3** | | |
| **P2** | Food cart: where to set up, the special, recipes with mastery, the first vending machine, the stand run by someone else | Whether a third decision and a handed-off business feel like growth or like more to keep track of | When the cart arrived, what did you stop thinking about? |
| | **Playtest 4** | | |
| **P3** | The look and sound, on one scene: the stand and its street in the new art, one music theme with layers | "The visuals should be way more appealing"; "the music felt more ominous than relaxing" | Does this look and sound like a game you want to open? |
| **P4** | Food truck: the route, events, seasons and trends, weekly bills, warnings and going broke | Whether money pressure reads as stakes or as stress | Tell me about a week that went badly. How did it feel? |
| | **Playtest 5** | | |
| **P5** | Contracts: the request board, catering and wholesale | Whether requests from named customers give the week a shape | Which job did you turn down, and why? |
| **P6** | Restaurant: the room, staff, a seasonal menu | The Restaurant City flow, and whether a bigger menu stays a pleasure | What did you change about the restaurant last, and what prompted it? |
| | **Playtest 6** | | |
| **P7** | Second location, managers, long-term goals for the endless game | "Endless sandbox but needs to have incentives" | What are you working toward now? |

## Why this order

- **P1 first, and plain.** Two builds of v1 were polished before anyone knew whether the days were worth playing. This time the days are tested before anything else is built on them.
- **P2 before any art.** The hand-off rule is the riskiest idea in the design. If owning two things feels like twice the chores, the whole ladder needs rethinking, and that is better learned before drawing eight stages.
- **P3 as soon as the core holds.** Looks and sound matter a great deal to Benjamin, and a single finished scene will show whether the art route works before it is applied everywhere.
- **Bills arrive with the truck (P4).** That is the first stage with something real to lose.
- **The restaurant is late** because it is the largest step and reuses everything before it.

How sure is this order? About 65% that it is the best one. The main alternative, at about 25%, is moving P3 ahead of P2 because the current look is one of his three main complaints. If Playtest 3 goes well and the look is what he mentions first, swap them.

## What is not on this roadmap yet

Rival vendors, a story, and a wider world beyond one city. Each is a question in `docs/learning/UNKNOWNS.md`.
