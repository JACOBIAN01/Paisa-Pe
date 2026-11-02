# @pp/harness

Owner: platform-core. Layer: side: harness.

## Owns

- Fake clock
- Emitters
- Storage mock
- Render helpers
- Chaos controls
- Scenarios

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `platform/*` (through its public entry point)
- `mockplatform/*` (through its public entry point)
- `services/*` (through its public entry point)
- `design-system/*` (through its public entry point)
- `features/*` (through its public entry point)
- `harness/*` (through its public entry point)

## Must not import

- `apps/*`
- `tools/*`

## Rules

- Public API is `index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
