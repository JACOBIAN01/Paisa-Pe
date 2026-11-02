# @pp/tools

Owner: mobile-infra. Layer: side: tools.

## Owns

- gen
- inject
- loc
- checks

## May import

- `contracts/*` (through its public entry point)
- `tools/*` (through its public entry point)

## Must not import

- `core/*`
- `platform/*`
- `mockplatform/*`
- `services/*`
- `design-system/*`
- `features/*`
- `apps/*`
- `harness/*`

## Rules

- Public API is `index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
