# PaisaPe — Progressive Student Bug Bounty

PaisaPe is a local mock-wallet app. The challenge contains **25 intentional bugs** across three progressive levels. Your goal is to restore the app feature by feature—not just collect isolated findings.

## How progression works

### Level 1 — Easy: Unlock core features

Find and fix 10 independent issues. Each one restores a core behaviour in one feature area:

1. Wallet home
2. Add money
3. Send money
4. Money requests
5. Activity
6. Virtual cards
7. Budgets
8. Savings goals
9. Bill payments
10. Beneficiaries

Treat each feature as a small milestone. Verify that feature works before moving to the next level.

### Level 2 — Medium: Complete feature workflows

Find 10 issues that affect deeper interactions inside the feature areas. These may involve state, filtering, validation, navigation, lists or edge cases. The objective is to make each workflow behave consistently from start to finish.

### Level 3 — Hard: Complete the application

Find 5 issues that cross feature boundaries. Investigate how shared state and user actions affect the wallet balance, activity history and other screens. A fix should preserve consistency across the app.

The levels describe investigation effort, not financial severity. Each report should identify one root cause. Do not combine unrelated symptoms into one finding.

## Learning scope

**JavaScript:** values, arrays, objects, functions, map, filter, reduce and basic validation.

**React:** components, props, state, Context, hooks, memoization and effects.

**React Native:** View, Text, Pressable, TextInput, FlatList, Switch, StyleSheet and accessibility.

**Expo:** Expo Router navigation and basic app lifecycle behaviour.

Stay within beginner-friendly JavaScript, React and React Native concepts. TypeScript, Redux, backend services, databases and real payment integrations are outside the challenge scope.

## Rules

1. Report bugs in this repository only.
2. Do not attack real payment systems, external services, accounts, devices or networks.
3. Do not modify the app to make a finding disappear.
4. Submit one root cause per report.
5. Include exact reproduction steps, expected result, actual result, impact, affected file and suggested fix.
6. Verify a fix on the affected screen and check that it does not break an earlier feature.
7. Do not publish or share instructor-only materials.

## Report format

- Title:
- Level: Easy / Medium / Hard
- Feature area:
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