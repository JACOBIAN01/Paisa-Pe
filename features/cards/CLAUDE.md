# @pp/feat-cards

Owner: payments. Layer: L4 features.

## Owns

- Card screens

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `platform/*` (through its public entry point)
- `services/*` (through its public entry point)
- `design-system/*` (through its public entry point)

Within `features/*` this package may only import itself; no feature-to-feature imports.

## Must not import

- `mockplatform/*`
- `features/*`
- `apps/*`
- `harness/*`
- `tools/*`

## Rules

- Public API is `src/index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
