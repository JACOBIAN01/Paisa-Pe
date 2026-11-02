# @pp/platform-deeplink

Owner: mobile-infra. Layer: L2 platform.

## Owns

- URL parsing
- Link routing

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `platform/*` (through its public entry point)

## Must not import

- `mockplatform/*`
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
