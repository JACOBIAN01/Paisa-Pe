# PaisaPe — Student Bug Bounty

Find **25 intentional bugs** in this local demo wallet. The challenge is about JavaScript, React, React Native and Expo fundamentals—not real financial infrastructure.

## Challenge levels

- **Easy — 8 findings:** input handling, formatting and visible UI behaviour.
- **Medium — 10 findings:** component state, list rendering, hooks, effects, accessibility and navigation lifecycle.
- **Hard — 7 findings:** race conditions, repeated actions, route parameters and edge cases.

The levels describe investigation effort, not financial severity.

## Learning scope

**React:** state updates, stale closures, Context, hooks, memoization, effects and cleanup.

**React Native:** TextInput, Pressable, Switch, FlatList, accessibility and rendering behaviour.

**Expo:** Expo Router, deep links, notifications, device APIs and app lifecycle.

## Rules

1. Report bugs in this repository only.
2. Do not attack real payment systems, external services, accounts, devices or networks.
3. Do not modify the app to make a finding disappear.
4. Submit one root cause per report.
5. Include exact reproduction steps, expected result, actual result, impact, affected file and suggested fix.
6. Do not publish or share instructor-only materials.

## Report format

- Title:
- Level: Easy / Medium / Hard
- Affected screen/file:
- Preconditions:
- Steps to reproduce:
- Expected result:
- Actual result:
- Why this matters:
- Suggested fix:

## Setup

Requirements: Node.js 20+ and npm.

```bash
npm ci
npx expo start
```

Open the app in Expo Go or a development build. Press `i` for iOS Simulator or `a` for Android Emulator.

All wallet operations use local mock data. No real money, payment credentials or bank integrations are involved. Data resets when the app restarts.
