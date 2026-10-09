---
name: game-build-verify
description: Use when implementing, tuning or checking a change to a deterministic simulation game such as Squeeze City - writing sim or UI code from a spec, changing config numbers, running the balance bots or the decision audit, or judging whether a build is ready to playtest.
---

# Game build and verify

Building is finished when the change has been shown to matter to the player, and passing tests is only part of that. The first version of Squeeze City passed all 10 of its balance targets while a player who never touched the recipe or price earned 98% as much as one who played well.

This skill is the third of three. `game-research` answers open questions. `game-design` writes the spec this skill builds.

## Before building

- Follow the repo's `CLAUDE.md`. Its architecture rules are fixed.
- Build from a spec in `docs/GDD.md`. If there is none, use `game-design` first.
- Propose a short plan and wait for approval.
- Work on a branch and open a pull request. Never push to `main`: it deploys the live game.

The repo's copy of this skill is the master. If it differs from the one you loaded, follow the repo's.

## Build order

1. Sim rules and config numbers, with a unit test for each formula
2. Bots: teach the existing bots to use the new feature, and add one that never uses it
3. The audit and balance runs (below)
4. The feedback the player sees: numbers, bubbles, report lines
5. Hand off to a playtest

Feedback comes before polish. A mechanic the player can't see working has not shipped.

## Three checks, and what each one proves

| Command | Proves | Does not prove |
|---|---|---|
| `npm test` | each formula does what the spec says | that the formula is a good idea |
| `npm run balance` | money grows at the planned pace | that choices matter |
| `npm run audit` | playing well beats playing lazily, and purchases pay for themselves | that it is fun |

Run all three after any sim or config change. Report every FAIL plainly, including ones that were already failing. To check a different part of the game: `npm run audit -- --loc financial`.

Only the player can say whether it is fun. When the player's verdict and the numbers disagree, the player is right; log the disagreement in `docs/learning/LESSONS.md` and find out what the numbers missed.

## Rules for bots

- Leave bot behavior alone while tuning a milestone. A bot rewritten to make a target pass is no longer measuring anything.
- Every new thing the player can do gets a bot that never does it. If that bot earns nearly as much, the feature is a false choice.
- Tune config numbers freely. Changing a formula needs the player's sign-off.
- Log every tuning change in `docs/DECISIONS.md` with the reason.

## Handing off a playtest

End each milestone with:

- What was built, in two or three sentences
- Test, balance and audit results
- What to try, and for how many in-game days
- Three questions that don't lead the answer, for example: "When did you last change your plan, and why?", "Was there a moment you wanted to skip? What was happening?", "What caused your best and worst day?"

Ask the player to note where they were bored, confused, delighted or frustrated. Record the session in `docs/PLAYTEST.md` in their words.

## After the playtest

1. Find the line in `docs/learning/LESSONS.md` that said what the change was expected to do. Write what happened next to it.
2. Add what the player liked and disliked to `docs/learning/TASTE.md`, in their words.
3. Anything that surprised us goes in `docs/learning/UNKNOWNS.md`.
4. If a lesson would hold for another game, add it to section 15 of `docs/research/KNOWLEDGE.md`, and mark any finding there that it confirms or contradicts.
5. At a milestone's end, write four lines: what we expected, what happened, why they differed, what we will do differently.

## Keeping this skill current

A lesson confirmed twice (two playtests, or a playtest and an audit result) is promoted into the skill it concerns. A rule in a skill contradicted twice is removed. In the repo, edit the skill file in the same pull request. In chat, propose the full updated skill for the player to save. Keep this file under 150 lines.
