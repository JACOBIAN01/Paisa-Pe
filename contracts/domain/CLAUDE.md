# @pp/contracts-domain

Owner: platform-core. Layer: L0 contracts.

## Owns

- Money, Txn, User, Contact, Coupon, Request, Goal, Card, Limits
- Route table and error codes

## May import

- `contracts/*` (through its public entry point)

## Must not import

- `core/*`
- `platform/*`
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
