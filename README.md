# PaisaPe — React Native Bug Bounty

PaisaPe is a beginner-friendly mock wallet app for exploring bugs in JavaScript, React, React Native and Expo. It uses local sample data only. No real payments, bank accounts or credentials are involved.

## Learning scope

- JavaScript fundamentals: arrays, objects, functions, map, filter and reduce.
- React: functional components, props, useState, useEffect, useMemo, useContext and simple custom hooks.
- React Native: View, Text, Pressable, TextInput, ScrollView, FlatList, Switch, StyleSheet, Alert and basic keyboard handling.
- Expo: Expo Router navigation and basic device/platform APIs.

No TypeScript, Redux, backend, database, real payment gateway or advanced architecture is required.

## Demo features

- Wallet balance, add money, send money and request history.
- Virtual cards with freeze/unfreeze controls.
- Monthly budgets and category-wise spending.
- Savings goals and contributions.
- Sample electricity, mobile, water and internet bills.
- Beneficiary list and search.
- Monthly spending reports.
- Recurring payment overview.
- FAQs and local support tickets.
- Notification history and transaction search.

## Setup

Requirements: Node.js 20+ and npm.

    npm ci
    npx expo start

Open with Expo Go or a development build. Press i for the iOS simulator or a for an Android emulator.

## Project structure

    app/                  Expo Router screens
      (tabs)/             Home, Activity, Profile
      cards.js            Virtual card management
      budgets.js          Monthly budget overview
      savings.js          Savings goals
      bills.js            Sample bill payments
      beneficiaries.js    Saved people
      reports.js          Spending reports
      support.js          FAQs and support tickets
    src/
      components/         Reusable React Native UI
      context/            Wallet and feature state
      data/               Local sample data
      utils/              Small formatting helpers

## Important

Every feature is a local demonstration. State resets when the app restarts. Bill payments, card controls and wallet transfers do not connect to external financial services.

## Bug bounty rules

1. Find and report bugs in app code only.
2. Do not attack external services, accounts, devices or networks.
3. Do not modify the app to make a finding disappear.
4. Submit one finding per report with reproduction steps, expected result, actual result, impact, affected file and suggested fix.
5. Do not reveal or publish instructor answer keys.
