# @pp/app-storybook-lite

Owner: experience. Layer: L5 apps.

## Owns

- Gallery shell

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `platform/*` (through its public entry point)
- `mockplatform/*` (through its public entry point)
- `services/*` (through its public entry point)
- `design-system/*` (through its public entry point)
- `features/*` (through its public entry point)

## Must not import

- `apps/*`
- `harness/*`
- `tools/*`

## Rules

- Public API is `src/index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
