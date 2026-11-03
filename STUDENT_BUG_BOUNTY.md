# Student Bug Bounty Guide

Find 20–25 intentional bugs in PaisaPe. The defects focus on React, React Native and Expo fundamentals—not real financial infrastructure.

## Scope

**React basics:** state updates, stale closures, effects and cleanup, dependency arrays, props, Context, list keys, conditional rendering and controlled inputs.

**React Native basics:** core components, FlatList, TextInput, Pressable, Switch, ScrollView, keyboard behaviour, styling, platform differences and accessibility.

**Expo basics:** Expo Router navigation, app configuration, device APIs, notifications and platform capabilities.

## Levels

- **Easy:** visible UI or input issue; usually reproducible in a few steps.
- **Medium:** state, navigation, list rendering, hooks or platform lifecycle issue.
- **Hard:** race condition, stale state across screens, lifecycle cleanup or edge case requiring careful reproduction.

## Report format

- Title:
- Severity: Easy / Medium / Hard
- Affected screen/file:
- Preconditions:
- Steps to reproduce:
- Expected result:
- Actual result:
- Why this matters:
- Suggested fix:

A good report must be repeatable and specific. One report should describe one root cause.

## Safety

This is a local mock wallet. Do not connect real bank accounts, use real credentials, intercept traffic, scan external infrastructure or attempt to affect another person's device or data. Do not add real payment integrations.

Run with npm install and npx expo start. Start at Home. Explore unusual inputs, rapid taps, navigating away and back, empty lists, long text and switching screens.
