# PROGRESS

Read this first when resuming in a new session.

## Environment notes

- Node v26 locally (repo declares `>=20`). pnpm is not installed globally; use `npx -y pnpm@9.15.9 <cmd>` or put a `pnpm` shim on PATH.
- Run all gates with `pnpm check` (typecheck, lint, test, cycles). `pnpm loc` prints the size report.

## Done

### Phase 0: Foundation

- pnpm + Turborepo monorepo, strict TypeScript, Prettier, ESLint 8 (boundaries, import, react-hooks), dependency-cruiser, Jest (ts-jest).
- 64 workspace packages scaffolded from `tools/gen/registry.ts` (stub `index.ts`, README, CLAUDE.md, tsconfig, package.json each). Path aliases and CODEOWNERS are generated.
- Layer rules defined once in `tools/gen/layers.json`; proven to reject upward imports, cross-feature imports, deep imports, relative cross-package imports and cycles.
- `contracts/*` implemented: domain schemas (ids, money, user, session, txn, request/split, rewards, goal, card, limits, bills, notifications, preferences, risk, routes, sync, errors), API endpoint table (50 endpoints), event map, WebView IPC schemas.
- `tools/loc` and `tools/gen` implemented and tested.
- `ARCHITECTURE.md`, `CODEOWNERS`, `private/` skeleton.

### Phase 1–3: Product foundation, platform and application shell

- Core runtime, deterministic mock platform, device abstractions and domain services are implemented
  and covered by unit tests.
- The mobile Expo Router shell, design system and all 19 listed feature packages are wired through
  the public package APIs. The app bundles successfully for iOS.
- The harness supplies deterministic app composition, a clock, storage, event capture, chaos
  controls and platform fakes for student-authored tests.

### Phase 4: Clean freeze

- Completed 25 deterministic happy-path scenarios covering sign-in/PIN, lock behavior, biometrics,
  cold and warm links, notification routing, help-centre messages, clipboard OTP, account switching,
  settings, privacy shield, payments, requests, rewards, goals, cards, bills, offline retry,
  history, limits and synchronization.
- Wrote the student-facing harness guide with setup, deterministic testing guidance, platform fakes,
  rules of engagement and submission format.
- Full quality gate passed: typecheck, lint (zero warnings), Jest (91 suites / 856 tests) and
  dependency-cycle checks. The scenario suite contains 20 suites / 67 tests.
- LOC report: 648 TypeScript files, 20.0K source LOC and 11.1K test LOC. Test coverage meets the
  planned budget; source breadth remains intentionally below the 31.0K target.

## Next

Phase 5: create the bug manifest and the 30 isolated, reversible patch commits from the `v-clean`
baseline. Do not modify the clean baseline except for a real defect that is outside the catalogue.

## Decisions and deviations

- The brief lists 19 features (not 18); all 19 are scaffolded.
- `harness` and `tools` keep their sources at the package root (`index.ts`, subfolders), as in the brief's tree. Every other package uses `src/`.
- Test files may import `mockplatform` and `harness` in addition to their layer's allowed imports.
- `paisape` team handles in CODEOWNERS are fictional.
- `react-hooks/exhaustive-deps` is `warn`; lint runs with `--max-warnings 0`.
- ts-jest is used for now; switch to `jest-expo` in Phase 3 when React Native tests appear.

## Known issues

- The app has bundled for iOS but has not been exercised in Expo Go on a physical device.
- A few scenario tests emit React `act` and fake-timer console warnings despite passing. They are
  harness-test noise rather than runtime failures and should be cleaned up independently of bug
  injection work.
