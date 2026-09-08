## Purpose

Self-verification and governance requirements for the agent harness: the gates that guard the codebase must also guard themselves — detecting cross-platform asset drift, enforcing size budgets on harness assets, behavior-testing hook scripts, and keeping rule coverage aligned with the actual stack (desktop layer) and knowledge sources (vendored skills).

## ADDED Requirements

### Requirement: Platform drift detection for generated OpenSpec assets

The verification gate SHALL compare generated OpenSpec assets across the installed platforms (.trae, .claude, .opencode, .agents) and fail when the body content of the same logical asset differs between platforms. Comparison SHALL exclude frontmatter and SHALL normalize platform-specific invocation tokens (e.g. `/opsx-apply` vs `/openspec-apply-change`), argument-passing placeholders (e.g. OpenCode's `$ARGUMENTS` line), and markdown formatting (blank lines, list indentation) — platforms legitimately differ in all of these. The failure message SHALL name the drifted pair and the regeneration command.

#### Scenario: Body edited on one platform only

- **WHEN** the body of one OpenSpec asset is changed on a single platform while its counterparts stay unchanged
- **THEN** the verification gate fails and names the platform pair and the regeneration command

#### Scenario: Frontmatter-only differences

- **WHEN** platform copies differ only in frontmatter fields (e.g. allowed-tools, command naming)
- **THEN** the verification gate passes

#### Scenario: All copies consistent

- **WHEN** every logical asset has an identical body across platforms
- **THEN** the verification gate passes

### Requirement: Harness asset word budgets

Every harness content asset — each rule under .trae/rules, each plan document under .trae/documents, and the user profile — SHALL have a word budget recorded in the budget manifest, and the verification gate SHALL fail when an asset exceeds its budget or lacks a budget entry.

#### Scenario: Asset grows beyond budget

- **WHEN** a rule or plan document is edited past its recorded word budget
- **THEN** the verification gate fails with the file path and both word counts

#### Scenario: New asset without budget entry

- **WHEN** a new rule or plan document is added without a manifest entry
- **THEN** the verification gate fails naming the unbudgeted file

#### Scenario: Assets within budget

- **WHEN** all harness assets are at or below their budgets
- **THEN** the verification gate passes

### Requirement: Hook behavior tests

The verification gate SHALL exercise each hook script with fixture payloads representing its real protocol events and assert observable outcomes, going beyond empty-stdin smoke: the harness guard SHALL block harness-asset write payloads and allow application-code write payloads; the catalog-regeneration hook SHALL invoke the mapped generator for a registered source path and pass through unregistered paths without action; the Stop reminder SHALL block with a reason enumerating the four closing-review channels (skill, note, profile, friction) and SHALL respect its dedup window.

#### Scenario: Guard blocks a harness edit

- **WHEN** the guard receives a PreToolUse payload writing to a harness asset path
- **THEN** it outputs a block decision

#### Scenario: Guard allows an application edit

- **WHEN** the guard receives a PreToolUse payload writing to an application source path
- **THEN** it exits 0 without a block decision

#### Scenario: Regen hook triggers its generator

- **WHEN** the regen hook receives a PostToolUse payload for a registered generator source
- **THEN** the mapped generator runs to completion with idempotent output

#### Scenario: Regen hook passes through unmapped paths

- **WHEN** the regen hook receives a payload for an unregistered path
- **THEN** it exits 0 without running any generator

#### Scenario: Stop reminder enumerates four channels

- **WHEN** the Stop hook receives a Stop event outside the dedup window
- **THEN** it blocks with a reason containing all four closing-review channel markers

#### Scenario: Stop reminder dedup

- **WHEN** the Stop hook fires again inside the dedup window
- **THEN** it exits 0 without blocking

### Requirement: Desktop IPC rule coverage

The rules tree SHALL contain a desktop rule domain whose IPC contract rule covers: the channel-addition workflow starting from the shared type map (one entry, three ends derive at compile time), the secureStore channel for sensitive data, and the constraint that only non-secret NUXT*PUBLIC*\* variables may transit launchEnv.

#### Scenario: Rule domain passes harness audit

- **WHEN** the verification gate audits rule frontmatter
- **THEN** the desktop rule passes the official format checks

#### Scenario: Secret exclusion is stated

- **WHEN** the desktop IPC rule is reviewed
- **THEN** it states that secrets never transit launchEnv and sensitive data persists through secureStore

### Requirement: Vendored skill precedence

AGENTS.md SHALL state that vendored third-party skills are generic references and that project rules win whenever skill guidance conflicts with them.

#### Scenario: Conflicting guidance resolves to project rules

- **WHEN** a vendored skill recommends a pattern a project rule forbids (e.g. class-validator DTO validation vs the zod validation rule)
- **THEN** the agent follows the project rule, per the AGENTS.md precedence statement

### Requirement: Closing-review consistency

The Stop-hook reminder reason SHALL enumerate exactly the four closing-review questions defined by the self-improvement rule, and the hook fixture test SHALL assert the four channel markers so hook and rule wording cannot drift silently.

#### Scenario: Hook and rule stay aligned

- **WHEN** the Stop reminder fixture test runs
- **THEN** the reason contains the skill, note, profile, and friction markers matching the rule's closing review

### Requirement: Manual behavior probes in the periodic harness audit

The periodic harness audit skill SHALL include a behavior-probe matrix covering: rule activation spot checks (description-triggered firing), subagent auto-dispatch probes for every registered expert, and skill loading probes. Probe results SHALL be recorded with the audit output.

#### Scenario: Expert dispatch probe

- **WHEN** the behavior-probe matrix runs
- **THEN** each registered expert has a dispatch probe with a recorded pass/fail result

#### Scenario: Rule activation probe

- **WHEN** a task matching a sampled rule description is performed during the audit
- **THEN** the rule's activation is confirmed or its failure recorded

### Requirement: Agent Note and OpenSpec change integration

The note contract SHALL define a single combined flow: changes planned through the OpenSpec workflow SHALL ship a thin Agent Note (one-sentence summary and a link to the change) with the full rationale living in the change's proposal and design documents; changes outside the OpenSpec workflow keep full notes as today. Archiving a change SHALL leave no dead note links.

#### Scenario: Thin note for OpenSpec changes

- **WHEN** a change planned via the OpenSpec workflow is implemented
- **THEN** its Agent Note contains a summary and a link to the change and does not duplicate the design decisions

#### Scenario: Full note outside the OpenSpec workflow

- **WHEN** a non-trivial change is made without the OpenSpec workflow
- **THEN** a full Agent Note (decisions, rejected alternatives) ships in the same change per the current contract

#### Scenario: No dead links after archive

- **WHEN** a change is archived to its final location
- **THEN** the note's link resolves to the archived location and the docs gate passes
