# @pp/mock-server

Owner: platform-core. Layer: side: mockplatform.

## Owns

- Router
- Handlers for every endpoint

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `mockplatform/*` (through its public entry point)

## Must not import

- `platform/*`
- `services/*`
- `design-system/*`
- `features/*`
- `apps/*`
- `harness/*`
- `tools/*`

## Rules

- Public API is `src/index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
