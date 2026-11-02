# @pp/core-net

HTTP client with interceptors, retry/backoff, abort and idempotency helpers.

**Layer:** L1 core
**Owner:** platform-core

## Owns

- Client
- Retry policy
- Idempotency header helpers

## Public API

Everything other packages may use is exported from `src/index.ts`. Deep imports are not allowed.
