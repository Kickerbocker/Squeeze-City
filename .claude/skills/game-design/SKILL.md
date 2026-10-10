---
name: game-design
description: Use when deciding what a strategy, simulation or tycoon game should do - writing or changing a feature spec, fixing something that feels boring, confusing or pointless, tuning an economy, or designing upgrades, staff, skill trees, map placement or progression.
---

# Game design

Design turns research and playtest notes into a short spec that can be built and checked. Gameplay comes first; art and audio serve it.

This skill is the second of three. `game-research` answers open questions. `game-build-verify` builds the spec and checks it.

## Read first

In the game's repo:

- `docs/learning/TASTE.md` - what the player finds fun. This outranks every rule below.
- `docs/PLAYTEST.md` - the newest session
- `docs/research/KNOWLEDGE.md` - for the system being designed, its family in the element catalog (section 5) and the failure catalog (section 3)
- `docs/research/PRINCIPLES.md` and `docs/learning/LESSONS.md`
- `docs/GDD.md` - the current design
- The output of `npm run audit` and `npm run balance`

The repo's copy of this skill is the master. If it differs from the one you loaded, follow the repo's.

## Start from a problem

Every spec starts from evidence: something the player said, or a number from the audit. Then work in this order:

1. **Feeling** - what the player should feel ("the tension of ordering too many lemons before a storm")
2. **Behavior** - what they would be doing to feel that ("checking the forecast and choosing how much risk to take")
3. **Rule** - the smallest mechanic that produces the behavior

A spec that starts at the rule ("add spoilage") tends to add a system nobody feels.

## Tests every design must pass

**Each decision the player makes repeatedly:**

- The best answer changes with the situation. If one answer wins on most days, it is a setting, and the player will stop looking at it.
- The player has the information to choose well before choosing.
- Choosing one option costs them another.
- The result is shown, with its cause, soon after.

**Each thing the player can buy:**

- It fixes a problem the player can already see. An upgrade that speeds up serving is worthless where nobody leaves the line.
- After buying, the game shows what changed in the player's own numbers ("12 more customers stopped today because of the sign").
- It pays for itself in a time the player would wait for, at the point in the game where it becomes affordable.
- It is a choice. If every sensible player buys the same things in the same order, it is a tier list.

**Each piece of realism:**

- It creates a decision with visible feedback. If it only adds bookkeeping, cut it.

**Each system:**

- It changes how at least one existing decision is made. A system that touches nothing else is bloat.
- Waiting is never the best move. If saving up means skipping days, the pacing is broken.

## When the call is uncertain

Give two or three options with rough odds of each working, and a recommendation. Say what playtest result would prove the recommendation wrong.

## Spec format

Keep it to one page.

- **Problem** - the playtest quote or audit number
- **Feeling / behavior** - as above
- **Rules** - what the game does, in plain sentences
- **Numbers** - exact values and the config file each lives in
- **What the player sees** - the feedback, screen by screen
- **Done when** - which audit and balance checks must pass, and the one question to ask after the playtest
- **Cut** - what was left out and why

Then:

1. Add a line to `docs/learning/LESSONS.md` stating what we expect the change to do, before it is built.
2. Update `docs/GDD.md`. It is the source of truth for the build.
3. Put ideas that came up but don't belong in this milestone in `docs/LATER.md`.

One milestone at a time, with a playtest between milestones.

## Keeping this skill current

When a design that passed these tests still wasn't fun, or a test here blocked something the player enjoyed, record it in `docs/learning/LESSONS.md`. A lesson confirmed twice is promoted into this file; a rule here contradicted twice is removed. In the repo, edit this file in the same pull request. In chat, propose the full updated skill for the player to save. Keep this file under 150 lines.
