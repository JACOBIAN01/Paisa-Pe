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

## Next

Phase 1: `core/*` and `mockplatform/*`.

## Decisions and deviations

- The brief lists 19 features (not 18); all 19 are scaffolded.
- `harness` and `tools` keep their sources at the package root (`index.ts`, subfolders), as in the brief's tree. Every other package uses `src/`.
- Test files may import `mockplatform` and `harness` in addition to their layer's allowed imports.
- `paisape` team handles in CODEOWNERS are fictional.
- `react-hooks/exhaustive-deps` is `warn`; lint runs with `--max-warnings 0`.
- ts-jest is used for now; switch to `jest-expo` in Phase 3 when React Native tests appear.

## Known issues

None.
