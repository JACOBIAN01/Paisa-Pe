# PaisaPe — React Native Bug Bounty

PaisaPe is a simplified wallet app for finding bugs in React, React Native, and Expo. It uses local mock data only. No real payments, accounts, or credentials are involved.

## Learning scope

- React: components, props, state, context, hooks, lists, keys, derived values and effects.
- React Native: View, Text, Pressable, TextInput, ScrollView, FlatList, Switch, StyleSheet and accessibility.
- Expo: Expo Router navigation, device information, app configuration, notifications and platform APIs.

## Setup

Requirements: Node.js 20+ and npm.

    npm install
    npx expo start

Open with Expo Go or a development build. Press i for the iOS simulator or a for an Android emulator.

## Project structure

    app/                  Expo Router screens
      (tabs)/             Home, Activity, Profile
      send.js             Send money form
      confirm.js          Payment confirmation
      request.js          Request money
      add-money.js        Add money
    src/
      components/         Reusable UI and transaction row
      context/            Wallet state
      utils/              Formatting helpers

## Bug bounty rules

1. Find and report bugs in app code only.
2. Do not attack real payment systems, external services, accounts, devices or networks.
3. Do not modify the app to make a finding disappear.
4. Submit one finding per report with reproduction steps, expected result, actual result, impact, affected file and suggested fix.
5. Do not reveal or publish instructor answer keys.

All wallet operations are local and reset when the app restarts.
