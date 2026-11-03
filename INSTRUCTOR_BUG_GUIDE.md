# PaisaPe instructor bug guide

This is an instructor-only explanation of the challenge catalogue. Do not copy it into a student
repository. The current published cohorts contain **B01-B16**. B17-B30 are the planned advanced
set; keep this guide as the answer key when those patches are added.

## How to use this guide

For every student report, ask for three things: a small repeatable test, a plain-language cause,
and a fix that removes the cause rather than hiding the symptom. A finding is strongest when its
test fails on the buggy copy and passes after the suggested correction.

## Tier 1

### B01 — PIN stored in normal storage

- **What is wrong:** The PIN verifier is saved in ordinary app storage instead of protected storage.
- **Where to look:** `services/auth/src/pin-vault.ts` and `services/auth/src/pin-service.ts`.
- **Why it matters:** Another app, a device backup, or a compromised device may read it.
- **Fix:** Store only a salted, slow hash in the secure-storage adapter. Never keep the raw PIN or
  a reusable verifier in plain app storage.

### B02 — Lockout based on device time

- **What is wrong:** Failed-PIN lockout trusts the phone clock and updates the attempt count too late.
- **Where to look:** `services/auth/src/lockout.ts` and `services/auth/src/pin-service.ts`.
- **Why it matters:** Changing the device clock can shorten a lockout; parallel attempts can also
  escape the intended limit.
- **Fix:** Keep the counter update and lock decision together, and use a trusted/monotonic time
  source for the lock period.

### B03 — Refresh token saved in normal storage

- **What is wrong:** A session refresh token is persisted in normal storage.
- **Where to look:** `services/auth/src/session-store.ts` and `services/auth/src/auth-service.ts`.
- **Why it matters:** Anyone who obtains that token can restore the session.
- **Fix:** Persist refresh credentials only through the secure-storage adapter, and remove them on
  logout or account change.

### B04 — Personal details sent to analytics

- **What is wrong:** The analytics event includes the entire transfer object.
- **Where to look:** `core/analytics/src/analytics.ts` and `services/transfers/src/service.ts`.
- **Why it matters:** Phone numbers, notes, and transaction details can leave the app in telemetry.
- **Fix:** Send a small allow-list of non-sensitive fields, such as outcome and amount band. Redact
  before the event is created, not only inside the logger.

### B05 — Sensitive screen visible in the app switcher

- **What is wrong:** The privacy cover reacts only to `background` and misses other lifecycle states.
- **Where to look:** `platform/lifecycle/src/privacy.ts`.
- **Why it matters:** Balance and transaction details can appear in the operating system's recent-app
  preview.
- **Fix:** Show the cover for every non-active state, including `inactive`, and remove it only when
  the app is active again.

### B06 — Help web page can send trusted commands

- **What is wrong:** The WebView message handler accepts navigation commands from any page.
- **Where to look:** `platform/webview-bridge/src/handler.ts`.
- **Why it matters:** Untrusted help content can try to open payment-related screens.
- **Fix:** Check the message origin against a strict allow-list, validate the message shape, and
  allow only a small list of safe routes.

### B07 — Clipboard OTP picks an unrelated number

- **What is wrong:** OTP autofill takes the first six-digit value found on the clipboard.
- **Where to look:** `platform/clipboard-otp/src/extract.ts`.
- **Why it matters:** It can submit a code copied from a different message or application.
- **Fix:** Require a clear OTP format and relevant context, present the candidate to the user, and
  never automatically submit it.

### B08 — Debug menu reachable in a release build

- **What is wrong:** Repeated taps make the debug menu available even outside development.
- **Where to look:** `features/debug-menu/src/index.ts` and
  `features/debug-menu/src/state/dev-tools.ts`.
- **Why it matters:** A user can change flags or inspect internal state in a production app.
- **Fix:** Compile or route debug tools out of release builds. A tap counter must not override the
  production gate.

## Tier 2

### B09 — Duplicate deep-link parameters mean different things

- **What is wrong:** The confirmation display reads one `amount` parameter while payment code reads
  another.
- **Where to look:** `platform/deeplink/src/parse.ts` and `services/transfers/src/params.ts`.
- **Why it matters:** A link can display a small amount but submit a larger amount.
- **Fix:** Parse once into a typed request, reject duplicate security-sensitive parameters, and pass
  that single parsed value through the flow.

### B10 — Deep-link listeners accumulate

- **What is wrong:** A deep-link event listener is added but not removed when the screen/hook ends.
- **Where to look:** `platform/deeplink/src/use-deep-links.ts` and
  `features/send-money/src/hooks/useTransferParams.ts`.
- **Why it matters:** One link can start multiple payment flows after navigating around the app.
- **Fix:** Return the listener cleanup from the effect and make handling idempotent.
- **Cohort note:** Do not combine this with B11; they deliberately alter the same flow.

### B11 — Cold-start link bypasses the lock gate

- **What is wrong:** The initial URL is routed before lock state and session state are ready.
- **Where to look:** `apps/mobile/src/runtime/start-platform.ts` and
  `platform/deeplink/src/router.ts`.
- **Why it matters:** A locked user can be sent into a sensitive payment screen.
- **Fix:** Queue the link until hydration and authentication/lock checks finish; then apply the same
  route policy used for warm links.
- **Cohort note:** Do not combine this with B10.

### B12 — Displayed amount and charged amount differ

- **What is wrong:** The input widget and money parser accept/normalize number formats differently.
- **Where to look:** `design-system/src/components/AmountInput.tsx` and `core/money/src/parse.ts`.
- **Why it matters:** Values such as exponent notation, commas, or local digits can look different
  from what reaches the ledger.
- **Fix:** Use one strict parser for both display and submission; reject unsupported formats rather
  than guessing.

### B13 — App appears unlocked before saved lock state loads

- **What is wrong:** The default state is unlocked while persisted lock state is still loading.
- **Where to look:** `platform/lifecycle/src/lock-store.ts` and
  `apps/mobile/src/runtime/AppProviders.tsx`.
- **Why it matters:** Sensitive content is briefly actionable at cold start.
- **Fix:** Default to locked (or a neutral loading screen) and render protected content only after
  hydration is complete.

### B14 — Biometric errors become success

- **What is wrong:** Outcomes other than success/cancel fall through to the unlock path.
- **Where to look:** `platform/biometrics/src/authenticate.ts` and
  `features/auth/src/hooks/useBiometricUnlock.ts`.
- **Why it matters:** Fallback, unavailable, or not-enrolled states can unlock the app.
- **Fix:** Treat only an explicit success result as success. Handle every other result as a failed or
  unavailable authentication attempt.

### B15 — Lock screen leaves the sensitive screen alive underneath

- **What is wrong:** The lock view is layered over already-rendered protected content.
- **Where to look:** `apps/mobile/src/runtime/AppProviders.tsx` and
  `platform/lifecycle/src/lock-store.ts`.
- **Why it matters:** Back navigation or a rendering mistake can reveal the previous screen.
- **Fix:** Make the lock screen a true gate: do not render protected children while locked, and clear
  or replace sensitive navigation state when appropriate.

### B16 — Notification route is trusted without validation

- **What is wrong:** Notification data is cast directly into a route and parameters.
- **Where to look:** `platform/notifications/src/tap.ts` and
  `apps/mobile/src/runtime/start-platform.ts`.
- **Why it matters:** Crafted local notification data can open a payment confirmation with attacker
  chosen values.
- **Fix:** Parse the payload with a schema, allow-list destinations, validate parameters, and route
  only after normal session and lock checks.

### B17 — Limits cache is shared between accounts

- **What is wrong:** Flags and limits are cached with a device-wide key rather than a user key.
- **Where to look:** `core/flags` and `services/limits/src/limits-service.ts`.
- **Why it matters:** Switching accounts can temporarily give one user another user's limits or flag
  configuration.
- **Fix:** Scope both memory and persistent cache entries by user ID, clear them on account change,
  and verify the active user before applying an async response.

### B18 — Transaction query cache omits the user

- **What is wrong:** The transaction cache key contains only the page, not the active account.
- **Where to look:** `core/query` and the transaction/ledger query callers in `services/ledger`.
- **Why it matters:** After an account switch, old transaction rows and IDs can be shown for the new
  user.
- **Fix:** Include user ID in every account-bound query key and clear/cancel account-bound cache data
  on session changes.

## Tier 3

### B19 — Double payment uses a fresh idempotency key

- **What is wrong:** The pay button relies on delayed React state and makes a new idempotency key on
  each retry.
- **Where to look:** `features/send-money`, `services/transfers`, and `core/net`.
- **Why it matters:** A double tap or timeout/retry can cause two server-side transfers.
- **Fix:** Create one key per payment intent, keep an immediate in-flight guard (for example a ref or
  service mutex), and reuse the same key for all retries.
- **Cohort note:** This intentionally chains with B30 only when the chain option is used.

### B20 — Offline queue flushes overlap

- **What is wrong:** An async interval begins another queue flush before the earlier one finishes.
- **Where to look:** The offline queue in `services/transfers` and its storage access.
- **Why it matters:** Two flushes can read the same item and submit it twice.
- **Fix:** Serialize flushes with one queue worker/mutex, remove an item atomically only after its
  confirmed result, and reuse its original idempotency key.

### B21 — Cancelled request is re-queued as a network failure

- **What is wrong:** Aborting a request is classified as retryable failure even when the server may
  already have processed it.
- **Where to look:** `features/send-money`, `services/transfers`, and `core/net`.
- **Why it matters:** Leaving a screen can create a later duplicate debit.
- **Fix:** Model abort/cancel separately from network failure. Before retrying an uncertain request,
  reconcile it with the server using the original idempotency key.

### B22 — Optimistic rollback erases newer balance changes

- **What is wrong:** A failed mutation restores an old whole-balance snapshot.
- **Where to look:** The optimistic query/update path in `core/query` and `services/ledger`.
- **Why it matters:** Credits received after the mutation began disappear from the local view.
- **Fix:** Roll back only the mutation's own change, or refetch after failure. Do not replace newer
  state with a stale snapshot.
- **Cohort note:** Do not combine this with B23; both target the same balance freshness path.

### B23 — Older balance response overwrites newer response

- **What is wrong:** Slow earlier requests can write their result after a newer refresh.
- **Where to look:** Balance refresh logic in `services/ledger` and its limit consumer in
  `services/limits`.
- **Why it matters:** The app uses a stale balance for display and local spending checks.
- **Fix:** Attach a request sequence/version to refreshes (or cancel earlier ones) and apply a result
  only if it is still the newest for that user.
- **Cohort note:** Do not combine this with B22.

### B24 — Split calculation is stale and loses money

- **What is wrong:** A callback misses the current participant list and rounds each share separately.
- **Where to look:** `features/split-bill` and `services/requests`.
- **Why it matters:** A split can target the wrong people and its parts may not add up to the bill.
- **Fix:** Include all changing inputs in the calculation, work in integer paise, and allocate the
  remainder deterministically so all shares sum exactly to the total.

### B25 — Request rows use index keys

- **What is wrong:** A changing request list uses list indexes as React keys while each row owns
  confirmation state.
- **Where to look:** `features/request-money` list component and its confirmation UI.
- **Why it matters:** A new row inserted at the top can move an open confirmation sheet to a different
  request.
- **Fix:** Use the stable request ID as the key and store the selected request ID above the row when a
  confirmation is open.

### B26 — Event is lost during re-subscription

- **What is wrong:** A hook unsubscribes and subscribes in separate tasks whenever a dependency
  changes.
- **Where to look:** `core/event-bus` consumers, especially the recent-payment logic in
  `features/home`.
- **Why it matters:** A received-payment event in the gap is not reflected until a full sync.
- **Fix:** Keep one stable subscription and read changing values through a ref, or subscribe
  synchronously with a handler that cannot miss the handover.

### B27 — `inactive` keeps resetting the lock timer

- **What is wrong:** Every app-state transition restarts the security timer, including transitions
  caused by a biometric prompt or permission dialog.
- **Where to look:** `platform/lifecycle` and the lock integration in `features/security-centre`.
- **Why it matters:** Repeated dialogs can keep a sensitive session alive indefinitely.
- **Fix:** Start the deadline once when the app leaves active state; do not extend it for intermediate
  transitions. Compare the deadline against a trusted monotonic clock when resuming.

### B28 — Fee rounding drifts over repeated payments

- **What is wrong:** Fees are rounded down per line using floating-point arithmetic, then summed.
- **Where to look:** `core/money` fee helpers and ledger reconciliation in `services/ledger`.
- **Why it matters:** Sum-of-rounded values differs from rounded total and can slowly distort balances.
- **Fix:** Use integer paise/basis points throughout and choose one documented rounding point for the
  entire transaction.

### B29 — Sync cursor skips equal timestamps

- **What is wrong:** Pagination asks for records strictly newer than the cursor.
- **Where to look:** `services/sync` and the delta endpoint in `mockplatform/server`.
- **Why it matters:** Records sharing a timestamp at a page boundary can be skipped; later conflict
  handling can lose a local change.
- **Fix:** Use a stable cursor made from timestamp plus ID (or an inclusive query with deduplication),
  and use server ordering/versioning for conflict resolution.

### B30 — Retry counter is shared by unrelated requests

- **What is wrong:** Network backoff stores one module-level attempt counter.
- **Where to look:** `core/net` retry/backoff code and transfer retry callers in `services/transfers`.
- **Why it matters:** A failing background job can delay a payment retry past the server's idempotency
  window; with B19 this can produce a duplicate charge.
- **Fix:** Keep retry state per request/operation, cap it locally, and preserve the original
  idempotency key for the entire payment intent.

## Important pairings

- B10 and B11 conflict; publish only one of them in a cohort.
- B22 and B23 conflict; publish only one of them in a cohort.
- B19 and B30 are a deliberate chain. They may be published together only when you want the advanced
  double-charge exercise.
