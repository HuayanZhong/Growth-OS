# frontend-motion

## Purpose

收拢桌面端 GSAP 动画接线（插件注册、动画目标归一化、入场/离场动画、生命周期回收）为统一 composable 的外部可观察行为：组件不再各自注册插件或处理 fragment 锚点，动画完成无内联残留，组件卸载自动回收进行中的 tween。

## Requirements

### Requirement: Centralized GSAP plugin registration

The desktop app SHALL register GSAP's CSS plugin exactly once at module load of the motion composable, idempotently, so individual components no longer perform plugin registration.

#### Scenario: Component uses motion API without local registration

- **WHEN** a component calls the motion composable's entrance/exit API without importing or registering GSAP plugins itself
- **THEN** CSS transform/opacity animations run correctly (plugin is registered)

#### Scenario: Repeated registration is harmless

- **WHEN** the plugin registration executes multiple times across module reloads or HMR
- **THEN** registration remains idempotent with no errors

### Requirement: Entrance animation with first-frame start values and residue cleanup

The entrance API SHALL animate a real element from explicit start values using `fromTo` semantics, SHALL apply start values on the first frame (no flicker), and SHALL clear transform/opacity inline residue on completion unless the caller overrides cleanup.

#### Scenario: Standard entrance

- **WHEN** the entrance API is called with a target element and from/to vars
- **THEN** the element animates from the given start values to the end values, and inline `transform`/`opacity` are cleared when the animation completes

#### Scenario: Custom cleanup override

- **WHEN** the caller supplies its own `clearProps` value
- **THEN** the caller's value wins over the default

### Requirement: Exit animation that supersedes in-flight tweens and resolves on completion

The exit API SHALL kill existing tweens on the target before starting, SHALL return a promise resolved when the exit animation completes, and SHALL support an `onComplete` continuation supplied by the caller.

#### Scenario: Exit after entrance

- **WHEN** the exit API is called while an entrance animation is still running on the same element
- **THEN** the in-flight tween is killed first and the exit animation runs from the current state without restarting from the entrance start values

#### Scenario: Awaitable exit

- **WHEN** the caller awaits the exit API result
- **THEN** the promise resolves exactly when the exit animation completes (allowing navigation or state flips to follow)

### Requirement: Animation target normalization

The motion API SHALL normalize animation targets that may be Vue component instances or fragment anchors (text/comment nodes) into real elements, optionally falling back to a CSS selector query on the parent, per the animation rule.

#### Scenario: Fragment anchor normalization

- **WHEN** the passed target is not an element node (e.g. a v-if component's `$el` anchor)
- **THEN** the API returns/uses the parent element or the element found via the supplied fallback selector instead, and never passes a non-element node to GSAP

### Requirement: Lifecycle-safe disposal

When the motion composable is instantiated inside a component setup context, tweens created through its API SHALL be killed automatically when that component unmounts; explicit per-target kill remains available.

#### Scenario: Component unmounts mid-animation

- **WHEN** a component using the composable unmounts while a tween is running
- **THEN** tweens created via the composable for that component are killed (no residue, no writes to detached nodes)

#### Scenario: Explicit kill

- **WHEN** the caller invokes the explicit kill API for a target
- **THEN** tweens on that target are killed immediately
