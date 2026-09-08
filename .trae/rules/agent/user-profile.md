---
alwaysApply: false
description: User profile rules: observe the user during interactions and maintain the structured profile at .agents/user-profile.md — capture stable preferences (code style, problem-solving paths, tech stack, communication patterns) with confidence scoring, keep it free of secrets, and adapt default behavior to confident entries. Use when interacting with the user, noticing preference signals, or updating the profile.
---

# User Profile (Observation, Scoring, Update)

**When to use**: during any user interaction — to decide whether an observation qualifies for the profile, how to score it, and how to adapt behavior. The profile data lives in [.agents/user-profile.md](../../.agents/user-profile.md); this rule only governs how it is built and used.

## 1. Data collection standard

- **Sources**: user instructions and their wording, corrections and rejections, task-advancement style, verification demands, commit habits, chosen options when offered a decision.
- **Admission threshold**: record only (a) preferences the user states explicitly (immediate entry, high confidence), or (b) patterns observed in ≥2 independent interactions (enter at low confidence). Single events stay out.
- **No-go content**: never store credentials, tokens, personal private information, business data content, or anything covered by the Secrets section of the root AGENTS.md.
- **No duplication**: preferences already codified in root AGENTS.md, layer contracts, or `.trae/rules/**` have a home — link or reference them, never restate (one fact, one home).

## 2. Behavior feature taxonomy

The profile uses five fixed categories (template in the data file):

1. **Code style** — naming, abstraction appetite, formatting instincts beyond the lint rules.
2. **Problem-solving path** — evaluate-first vs hands-on, plan granularity, failure fallback preference, boundary sensitivity (e.g. skeleton-only scope).
3. **Tech stack choices** — package manager, toolchain preferences, library inclinations not yet covered by catalogs or rules.
4. **Communication patterns** — language, verbosity, advancement style (e.g. short directives), report format expectations.
5. **Workflow habits** — verification order, commit ownership, documentation and harness expectations.

## 3. Habit identification rules

- Explicit statement beats behavioral inference; on conflict, the most recent explicit statement wins.
- Distinguish project constraints (belong to rules/contracts) from personal habits (belong to the profile); migrate a habit into a rule only when the user asks for it.
- Do not infer from a single reaction; tone and mood are never recorded.

## 4. Preference weighting (confidence scoring)

Score each entry 1–5:

| Score | Meaning                                                    | Behavioral effect  |
| ----- | ---------------------------------------------------------- | ------------------ |
| 5     | Codified by the user (rule/AGENTS.md) — linked, not copied | Always applied     |
| 4     | Repeated explicit statements, or a correction              | Applied as default |
| 3     | ≥2 consistent behavioral observations                      | Applied as default |
| 2     | Single observation, pending corroboration                  | Reference only     |
| 1     | Weak signal, kept temporarily                              | Reference only     |

Adjustment rules: each corroborating observation +1 (cap 5); a contradicting observation −2 and mark `conflict: true` until clarified; an entry untouched for 30 days loses 1 point (floor 1). Entries with `conflict: true` are never applied.

## 5. Special cases

- **User correction of agent behavior**: update the related entry immediately and set confidence to 4, with the correction as evidence.
- **Profile vs live instruction**: the latest instruction always wins; apply it without asking, then downgrade the contradicted entry.
- **Sensitive content offered by the user**: refuse to record it and say so.
- **Multiple humans in the history**: keep entries scoped per person under the template's owner field; never blend observations from different authors.
- **Missing or corrupted profile file**: rebuild from the empty template in the data file — never reconstruct from guesswork.

## 6. Update mechanism and quality bar

- **Timing**: review the session's signals at task wrap-up (never interrupt an in-flight task to write the profile).
- **Evidence**: every entry carries a short `evidence` note (what was observed, when) and `last_updated` (YYYY-MM-DD).
- **Quality bar**: entries without evidence or with confidence 1 and no update for 30 days are pruned; the file must stay parseable as Markdown with the fixed template sections.
- **Review**: re-read the profile at the start of substantial multi-step tasks; adapt defaults to entries with confidence ≥3.

## 7. Service adaptation

- Confidence ≥3 entries shape default behavior (report language, option framing, verification depth).
- The precedence chain is: system/safety rules → the user's latest instruction → codified rules/AGENTS.md → profile entries (confidence ≥3) → agent defaults.
- Adaptation is adjustment of defaults, never a license to skip verification, gates, or security constraints.
