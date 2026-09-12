---
alwaysApply: false
description: Agent self-improvement rule: at task wrap-up run the closing review (reusable workflow → distill a skill; decisions → Agent Note; user habits → user profile; rule friction → decay-audit backlog), keeping the improve loop (distill → apply → review → revise) running one step at a time. Use when finishing a task, noticing a repeatable workflow, or deciding where a lesson belongs.
---

# Agent Self-Improvement (Skill Distillation & Closing Review)

**When to use**: at task wrap-up (together with the Stop-hook reminder) and whenever a repeatable workflow or a corrected mistake appears mid-task.

## 1. The three sedimentation channels (one home each)

| Signal                                              | Home                           | Governing rule                       |
| --------------------------------------------------- | ------------------------------ | ------------------------------------ |
| User habits, interaction patterns, preference drift | `.agents/user-profile.md`      | [user-profile.md](user-profile.md)   |
| Decisions, rejected alternatives, design rationale  | `.agents/notes/**`             | root AGENTS.md "Documentation rules" |
| Repeatable cross-task workflows                     | `.trae/skills/<name>/SKILL.md` | this rule §2                         |

A lesson goes to exactly one channel; never duplicate across them.

## 2. Skill distillation standard

Distill a workflow into a skill only when ALL hold:

1. **Reusable**: the flow will recur across future tasks (not a one-off solution).
2. **Cross-cutting or harness-level**: not project-domain logic — domain constraints belong in `.trae/rules/**`, decisions in notes.
3. **Stable**: the steps have succeeded at least once end-to-end and are unlikely to change next time.

Format: `.trae/skills/<kebab-name>/SKILL.md` per the Agent Skills spec (`name` = parent directory, `description` states what and when — the PreToolUse hook enforces this). One capability per skill; keep the body under ~100 lines and reference files instead of inlining.

## 3. Closing review (every substantial task)

At wrap-up, answer four questions (the Stop hook reminds automatically):

1. **Skill**: did this task produce a repeatable workflow meeting §2? → distill or skip with reason.
2. **Note**: were there non-trivial decisions? → note shipped in the same change.
3. **Profile**: did the user reveal habits/corrections? → update `.agents/user-profile.md` per its rule.
4. **Friction**: did any rule/gate get in the way or fail to catch something? → add to the decay-audit backlog ([.agents/notes/backlog-decay-audit.md](../../../.agents/notes/backlog-decay-audit.md); mention in the note), do not patch rules ad hoc.

## 4. Step-by-step self-optimization loop

`interact → sediment (skill/note/profile) → apply (next task uses them) → review (gates + decay audit) → revise`. Each cycle improves one step; do not batch redesigns of the harness. Rule or gate changes proposed by this loop follow the normal change flow (plan → approval → note).

## 5. Boundaries

- Never distill secrets, credentials, business data, or single-task specifics into skills.
- Skills are additive helpers; they never override rules, gates, or the user's latest instruction.
- A distilled skill that causes friction in later tasks is revised or retired at the next closing review — skills rot like docs and are covered by [rule-decay-audit](../../skills/rule-decay-audit/SKILL.md).
