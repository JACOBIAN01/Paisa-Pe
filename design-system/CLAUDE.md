# @pp/design-system

Owner: experience. Layer: side: design-system.

## Owns

- Tokens
- Text, Button, Input, Sheet, Toast, ListRow, AmountInput, PinPad

## May import

- `contracts/*` (through its public entry point)
- `core/*` (through its public entry point)
- `design-system/*` (through its public entry point)

## Must not import

- `platform/*`
- `mockplatform/*`
- `services/*`
- `features/*`
- `apps/*`
- `harness/*`
- `tools/*`

## Rules

- Public API is `src/index.ts` only. Import other packages by their `@pp/*` name, never by relative path or deep path.
- Layer rules are enforced by `pnpm lint` and `pnpm cycles`.
- Keep files small and focused. Add tests next to the code they cover.
