# PaisaPe Platform student exercise

PaisaPe is a deterministic React Native wallet training project. Your task is to find client-side
behavioural defects and prove each claim with a repeatable Jest test.

## Setup

Use Node 20 or newer and pnpm 9. Install dependencies with `pnpm install`, then run `pnpm check`.
Start the Expo app with `pnpm --filter @pp/app-mobile start`. The mock platform is in-process; do
not use real accounts, devices or network services.

## Test kit

Read `harness/README.md` first. `createTestApp` gives each test an isolated seeded backend,
controllable clock, storage and service container. Use `renderWithApp` for screens, and use the
provided platform fakes for links, AppState, notifications and clipboard state. A good proof has no
real sleeps and gives the same result on repeated runs.

## Rules

- Work only inside this repository and use public package entry points.
- Do not change the mock server, harness or existing tests to make a proof pass.
- Do not report a suspicion: submit a deterministic test that fails on this tree and passes after a
  correct fix.
- Keep one finding per submission and do not use external services.

## Submission

Create `submissions/<finding>.test.tsx`. Next to it, add a five-line note describing the observed
behaviour, affected files/packages, root cause, user impact and proposed fix. Run your test five
times before submitting it.
