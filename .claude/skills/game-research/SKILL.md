---
name: game-research
description: Use when a gameplay question about a strategy, simulation or tycoon game has no confident answer yet - studying how other games handled a mechanic, tearing down a reference game, or checking a design claim before a spec relies on it.
---

# Game research

Research exists to change a design decision. It covers gameplay only: mechanics, decisions, feedback, pacing, progression. Marketing, monetization, team and production topics are out of scope.

This skill is the first of three. `game-design` turns findings into specs. `game-build-verify` builds them and checks the result.

## Before researching

In the game's repo, read these first so nothing is researched twice:

- `docs/research/KNOWLEDGE.md` - what we already know about any game in these genres: methods, failure modes, an element catalog, sources
- `docs/research/PRINCIPLES.md` - the rules this game has adopted, with their evidence
- `docs/learning/UNKNOWNS.md` - questions already open
- `docs/learning/LESSONS.md` - what was tried and what happened
- `docs/learning/TASTE.md` - what the player has said is fun to them

If the repo is not attached, ask for it. Its copy of this skill (`.claude/skills/game-research/SKILL.md`) is the master; if it differs from the one you loaded, follow the repo's.

## Method

1. **Write the question as a decision.** "Should staff be hired per day or per week?" is researchable. "How do staff systems work?" is not. State what would be built differently for each possible answer. If nothing would change, don't research it.
2. **Pick three games that have the mechanic.** One the player loves, one well regarded, one known to have got it wrong.
3. **For each game, find how the mechanic failed before how it worked.** Search for guides, "best strategy", "optimal build", cheats and exploits. A guide that says "always do X" is proof of a solved decision, and that is the most common way this genre fails. Then read reviews for complaints that repeat: bored, grind, pointless, confusing, nothing left to do.
4. **Describe each mechanic in three layers**, in this order: the rule (what the game does), the behavior (what players end up doing because of it), the feeling (what that is like). Copying a rule without its behavior is how features get cargo-culted.
5. **Tag every claim** by how much it should be trusted:
   - `[E]` evidenced: a study, a developer's own statement, or documented player behavior such as a solved-strategy guide
   - `[X]` expert opinion: a respected designer's heuristic, untested
   - `[P]` proposal: our own guess or threshold, to be checked by bots and playtest
6. **Stop when another source would not change the decision.** One hour is a sensible ceiling for a single question. The player's playtest outranks any amount of reading.

## Output

- Findings that would hold for another game go into `docs/research/KNOWLEDGE.md`, in the section they belong to, tagged and sourced, with a line in its changelog. That file's own rules say how to mark a finding confirmed, contradicted or retired.
- A teardown at `docs/research/teardowns/<game>.md` using the template in `docs/research/teardowns/TEMPLATE.md`.
- At most five new rules added to `docs/research/PRINCIPLES.md`, each one checkable, tagged and sourced. These are the rules this game adopts. A rule nobody could test is commentary; leave it out.
- New open questions added to `docs/learning/UNKNOWNS.md`, each with how it could be answered.
- A short answer to the original question: recommendation, confidence, and what would change it.

`KNOWLEDGE.md` is mirrored in the Game Development project so it is available in chat for any game. After editing it, upload the file to the project again when the session can reach the project.

## Finding what we don't know

Neither the player nor Claude is an experienced game developer, so assume there are gaps nobody has named.

- Before designing any new system, run step 3 on three games that have it. Other people's failures name the unknowns.
- When a playtest surprises us, the surprise is an unknown that was just found. Log it in `UNKNOWNS.md` before fixing it.
- At each milestone's end, review `UNKNOWNS.md`. Anything open for two milestones gets a test or is marked "won't know".

## Keeping this skill current

When a research habit here wastes time or misses something twice, record it in `docs/learning/LESSONS.md`. A lesson confirmed twice is promoted into this file; a rule here contradicted twice is removed. In the repo, edit this file in the same pull request. In chat, propose the full updated skill for the player to save. Keep this file under 150 lines; move detail into `docs/research/`.
