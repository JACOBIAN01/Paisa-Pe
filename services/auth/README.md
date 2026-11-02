# @pp/svc-auth

OTP, session, refresh, PIN and lockout.

**Layer:** L3 services
**Owner:** identity

## Owns

- Session lifecycle
- Single-flight refresh
- PIN and lockout

## Public API

Everything other packages may use is exported from `src/index.ts`. Deep imports are not allowed.
