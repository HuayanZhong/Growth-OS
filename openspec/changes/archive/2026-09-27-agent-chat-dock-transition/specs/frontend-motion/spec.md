# frontend-motion Delta

## ADDED Requirements

### Requirement: Centralized GSAP Flip plugin registration

The desktop app SHALL register GSAP's Flip plugin exactly once at module load of the motion composable, idempotently, so pages performing layout-flip transitions (e.g. the agent chat dock transition) do not perform plugin registration themselves.

#### Scenario: Page uses Flip without local registration

- **WHEN** a page calls `gsap` Flip APIs without importing or registering the Flip plugin itself
- **THEN** the layout-flip transition animates correctly (plugin is registered)

#### Scenario: Repeated registration is harmless

- **WHEN** the Flip plugin registration executes multiple times across module reloads or HMR
- **THEN** registration remains idempotent with no errors
