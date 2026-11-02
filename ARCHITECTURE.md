# PaisaPe Platform: Architecture

A React Native (Expo + TypeScript) fintech wallet organised as a pnpm + Turborepo monorepo of 64 small packages. Dependencies point downward only.

## Layers

```
apps/            L5  runnable shells (mobile app, storybook-lite)
features/        L4  user-facing flows: screens, view-models, feature stores
services/        L3  domain logic: auth, ledger, transfers, sync, rewards, risk...
platform/        L2  device/runtime abstractions: deeplink, lifecycle, biometrics...
core/            L1  framework pieces: di, event-bus, storage, net, query, money...
contracts/       L0  types, zod schemas, API/IPC interfaces. No logic.

mockplatform/    side  in-process backend implementing the contracts
design-system/   side  tokens, primitives, components
harness/         side  test kit for students
tools/           side  generators, injector, LOC report, export checks
private/         never shipped
```

## Import rules

The single source of truth is [tools/gen/layers.json](tools/gen/layers.json). ESLint (`eslint-plugin-boundaries`), dependency-cruiser and the package generator all read it.

| Layer         | May import                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| contracts     | contracts                                                                               |
| core          | contracts, core                                                                         |
| platform      | contracts, core, platform                                                               |
| mockplatform  | contracts, core, mockplatform                                                           |
| services      | contracts, core, platform, services                                                     |
| design-system | contracts, core, design-system                                                          |
| features      | contracts, core, platform, services, design-system, and **only itself** within features |
| apps          | everything except harness and tools                                                     |
| harness       | everything except apps and tools                                                        |
| tools         | contracts, tools                                                                        |

Test files (`*.test.ts(x)`, `__tests__/`) may additionally import `mockplatform` and `harness`.

Further rules:

- Each package exposes `src/index.ts` only (`index.ts` for harness and tools). Deep imports (`@pp/x/src/y`) and relative imports across packages are lint errors.
- No import cycles, within or across packages (`pnpm cycles`).
- Packages are referenced by name (`@pp/core-storage`). Names resolve through `paths` in [tsconfig.base.json](tsconfig.base.json), which `pnpm gen all` regenerates from [tools/gen/registry.ts](tools/gen/registry.ts).

## Package naming

| Directory                           | Package name                                    |
| ----------------------------------- | ----------------------------------------------- |
| `contracts/x`                       | `@pp/contracts-x`                               |
| `core/x`                            | `@pp/core-x`                                    |
| `platform/x`                        | `@pp/platform-x`                                |
| `mockplatform/x`                    | `@pp/mock-x`                                    |
| `services/x`                        | `@pp/svc-x`                                     |
| `features/x`                        | `@pp/feat-x`                                    |
| `apps/x`                            | `@pp/app-x`                                     |
| `design-system`, `harness`, `tools` | `@pp/design-system`, `@pp/harness`, `@pp/tools` |

## Ownership

[CODEOWNERS](CODEOWNERS) is generated from the registry. Teams: platform-core, payments, identity, growth, experience, security, mobile-infra. Every package also has a `README.md` and a `CLAUDE.md` stating what it owns and what it must not import.

## Tooling

| Command          | Purpose                                                             |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm typecheck` | Turborepo runs `tsc --noEmit` in every package                      |
| `pnpm lint`      | ESLint with boundary rules, zero warnings allowed                   |
| `pnpm test`      | Jest (ts-jest) across all packages                                  |
| `pnpm cycles`    | dependency-cruiser: cycles and layer rules                          |
| `pnpm loc`       | LOC report against the size budget                                  |
| `pnpm gen all`   | Re-scaffold packages, CODEOWNERS and path aliases from the registry |

## Runtime model

There is no real backend. `mockplatform` runs in-process, is deterministic and seeded, and is **correct**. Client code talks to it through `core/net` using the contracts in `contracts/api`.
