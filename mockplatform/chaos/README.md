# @pp/mock-chaos

Seeded latency, jitter and failure injection.

**Layer:** side: mockplatform
**Owner:** platform-core

## Owns

- Latency
- failNext, timeoutNext, dropResponse
- Clock skew

## Public API

Everything other packages may use is exported from `src/index.ts`. Deep imports are not allowed.
