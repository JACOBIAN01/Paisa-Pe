# PaisaPe — iOS and Android Smoke Test Checklist

Run after `npm ci`, `npx expo-doctor` and the native platform export checks. Also run on at least one iOS Simulator/device and one Android Emulator/device before announcing the challenge.

## Environment

- [ ] Record Node.js and npm versions.
- [ ] Confirm the branch and commit SHA under test.
- [ ] Install dependencies from the committed lockfile with `npm ci`.
- [ ] Run `npx expo-doctor` and record warnings.
- [ ] Run `npx expo export --platform ios --platform android`.

## Launch and navigation

- [ ] App launches to Home without a red screen or fatal error.
- [ ] Home, Activity and Profile tabs render.
- [ ] Every Profile menu item opens the intended screen.
- [ ] Back navigation returns to the previous screen.
- [ ] Deep-link scheme does not crash the app when opened with an unknown path.
- [ ] Repeat screen navigation 5 times and watch for duplicate event handling.

## Wallet flows

- [ ] Add a valid positive amount.
- [ ] Send a valid amount to a recipient.
- [ ] Attempt to send more than the available balance.
- [ ] Create a money request.
- [ ] Open request history and inspect its filters.
- [ ] Expand and collapse transaction rows.
- [ ] Confirm the balance and activity list update after each operation.
- [ ] Test empty, whitespace, malformed, negative and high-precision inputs.
- [ ] Tap action buttons repeatedly and observe whether duplicate records appear.

## Platform-specific checks

### iOS
- [ ] Check safe-area spacing on Home and detail screens.
- [ ] Check decimal keyboard and text input behaviour.
- [ ] Check status bar contrast.
- [ ] Check VoiceOver labels on icon-only controls.
- [ ] Open and dismiss app links while Scan is mounted and unmounted.

### Android
- [ ] Check edge-to-edge layout and status/navigation bar overlap.
- [ ] Check hardware/system Back behaviour.
- [ ] Check decimal keyboard and text input behaviour.
- [ ] Check TalkBack labels on icon-only controls.
- [ ] Open and dismiss app links while Scan is mounted and unmounted.

## Regression / stability

- [ ] Background and resume the app.
- [ ] Navigate away from Notifications and Scan, then deliver a notification or URL event.
- [ ] Open Device information on a physical device and an emulator.
- [ ] Confirm no uncaught promise rejection or fatal navigation error.
- [ ] Capture screenshots/video for any unexpected result.

## Result log

| Platform | Device / OS | Commit | Result | Notes |
|---|---|---|---|---|
| iOS | | | Not run | |
| Android | | | Not run | |
