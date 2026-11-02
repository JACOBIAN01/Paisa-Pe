import type layersJson from './layers.json';

export type Layer = keyof typeof layersJson.layers;

export interface PackageSpec {
  layer: Layer;
  slug: string;
  team: string;
  description: string;
  owns: string[];
  deps?: Record<string, string>;
}

const ZOD = { zod: '^3.24.1' };

const p = (
  layer: Layer,
  slug: string,
  team: string,
  description: string,
  owns: string[],
  deps?: Record<string, string>,
): PackageSpec => ({ layer, slug, team, description, owns, deps });

export const PACKAGES: PackageSpec[] = [
  // L0 contracts
  p(
    'contracts',
    'domain',
    'platform-core',
    'Domain entities and zod schemas.',
    [
      'Money, Txn, User, Contact, Coupon, Request, Goal, Card, Limits',
      'Route table and error codes',
    ],
    ZOD,
  ),
  p(
    'contracts',
    'api',
    'platform-core',
    'Request/response contracts for every mock endpoint.',
    ['Endpoint table', 'Pagination and error envelopes'],
    ZOD,
  ),
  p('contracts', 'events', 'platform-core', 'Typed event-bus event map.', [
    'Event names and payload types',
  ]),
  p(
    'contracts',
    'ipc',
    'mobile-infra',
    'WebView bridge message schemas.',
    ['Web-to-native and native-to-web messages'],
    ZOD,
  ),

  // L1 core
  p('core', 'di', 'platform-core', 'Tiny dependency-injection container.', [
    'Tokens, container, scoped overrides',
  ]),
  p('core', 'event-bus', 'platform-core', 'Typed in-process pub/sub.', [
    'Emitter, subscription handles',
  ]),
  p(
    'core',
    'storage',
    'platform-core',
    'AsyncStorage wrapper, migrations, namespacing, secure-store facade.',
    ['Key-value storage', 'Schema migrations', 'Secure storage facade'],
  ),
  p(
    'core',
    'net',
    'platform-core',
    'HTTP client with interceptors, retry/backoff, abort and idempotency helpers.',
    ['Client', 'Retry policy', 'Idempotency header helpers'],
  ),
  p(
    'core',
    'query',
    'platform-core',
    'Query cache, invalidation and optimistic-mutation helpers.',
    ['Cache and keys', 'Invalidation', 'Optimistic updates'],
  ),
  p('core', 'store', 'platform-core', 'Zustand factories and persist/rehydrate helpers.', [
    'Store factories',
    'Rehydration gating',
  ]),
  p('core', 'i18n', 'experience', 'en, hi, bn catalogues and locale formatting.', [
    'Catalogues',
    'Number, currency and date formatting',
  ]),
  p('core', 'money', 'payments', 'Paise math, rounding, fee calculation, formatting and parsing.', [
    'Integer money arithmetic',
    'Fee calculation',
    'Amount parsing and formatting',
  ]),
  p('core', 'time', 'platform-core', 'Clock abstraction, timezone helpers and scheduler.', [
    'Wall and monotonic clocks',
    'Scheduler',
  ]),
  p('core', 'logging', 'platform-core', 'Logger with PII redaction.', [
    'Log levels',
    'Redaction rules',
  ]),
  p('core', 'analytics', 'growth', 'Analytics event tracking.', [
    'Event tracking',
    'Property sanitising',
  ]),
  p('core', 'flags', 'platform-core', 'Feature flags and remote-config style overrides.', [
    'Flag registry',
    'Overrides',
  ]),
  p('core', 'result', 'platform-core', 'Result/Either type and error taxonomy.', [
    'Result helpers',
    'AppError classes',
  ]),

  // L2 platform
  p('platform', 'lifecycle', 'security', 'AppState wrapper and app-lock timer.', [
    'App state transitions',
    'Lock timeout',
  ]),
  p(
    'platform',
    'deeplink',
    'mobile-infra',
    'Deep-link router, parser, cold/warm start handling and allowlist.',
    ['URL parsing', 'Link routing'],
  ),
  p('platform', 'biometrics', 'security', 'Biometric authentication wrapper.', [
    'LocalAuthentication result mapping',
  ]),
  p('platform', 'notifications', 'mobile-infra', 'Local notification scheduling and tap routing.', [
    'Scheduling',
    'Tap handling',
  ]),
  p('platform', 'connectivity', 'mobile-infra', 'Online/offline detector.', ['Connectivity state']),
  p('platform', 'webview-bridge', 'mobile-infra', 'Help-centre WebView and message bridge.', [
    'Bridge handlers',
    'Origin policy',
  ]),
  p('platform', 'clipboard-otp', 'security', 'Clipboard-based OTP autofill.', ['OTP extraction']),

  // side: mockplatform
  p('mockplatform', 'server', 'platform-core', 'In-process mock backend: router and handlers.', [
    'Router',
    'Handlers for every endpoint',
  ]),
  p(
    'mockplatform',
    'db',
    'platform-core',
    'In-memory database with persistence and seeded fixtures.',
    ['Tables', 'Seed data'],
  ),
  p('mockplatform', 'chaos', 'platform-core', 'Seeded latency, jitter and failure injection.', [
    'Latency',
    'failNext, timeoutNext, dropResponse',
    'Clock skew',
  ]),
  p('mockplatform', 'admin', 'platform-core', 'Test-only controls used by the harness.', [
    'Reset, seed, inspect',
  ]),

  // L3 services
  p('services', 'auth', 'identity', 'OTP, session, refresh, PIN and lockout.', [
    'Session lifecycle',
    'Single-flight refresh',
    'PIN and lockout',
  ]),
  p(
    'services',
    'ledger',
    'payments',
    'Local ledger mirror, reconciliation and balance projection.',
    ['Balance', 'Reconciliation'],
  ),
  p('services', 'transfers', 'payments', 'Send, cancel, retry, idempotency and offline queue.', [
    'Transfer intents',
    'Offline queue',
  ]),
  p('services', 'requests', 'payments', 'Money requests and split engine.', [
    'Requests',
    'Split calculation',
  ]),
  p('services', 'rewards', 'growth', 'Coupons, cashback, scratch cards and referrals.', [
    'Rewards state',
  ]),
  p('services', 'limits', 'payments', 'Daily/monthly limits and KYC tiers.', [
    'Limits snapshot',
    'Client-side limit checks',
  ]),
  p(
    'services',
    'sync',
    'platform-core',
    'Delta sync, pagination cursors and conflict resolution.',
    ['Delta sync', 'Conflict resolution'],
  ),
  p('services', 'goals', 'growth', 'Savings goals and interest preview.', ['Goals']),
  p('services', 'cards', 'payments', 'Virtual card display, freeze and unfreeze.', ['Card state']),
  p('services', 'bills', 'payments', 'Bill pay, recharge and autopay.', [
    'Billers',
    'Bill payments',
  ]),
  p('services', 'risk', 'security', 'Client-side risk prompts.', [
    'New payee and unusual amount prompts',
  ]),
  p('services', 'profile', 'identity', 'Profile, contacts and preferences.', [
    'Profile',
    'Contacts',
    'Preferences',
  ]),

  // L4 features
  p('features', 'onboarding', 'growth', 'First-run onboarding flow.', [
    'Welcome and permissions screens',
  ]),
  p('features', 'auth', 'identity', 'Login, OTP, PIN entry and lock screen.', [
    'Auth screens',
    'Lock gate',
  ]),
  p('features', 'home', 'experience', 'Home tab: balance, shortcuts and recent activity.', [
    'Home screen',
  ]),
  p('features', 'send-money', 'payments', 'P2P send flow.', [
    'Recipient pick',
    'Amount entry',
    'Confirm and pay',
  ]),
  p('features', 'request-money', 'payments', 'Money request creation and inbox.', [
    'Request screens',
  ]),
  p('features', 'split-bill', 'payments', 'Split-bill creation.', ['Split screens']),
  p('features', 'history', 'experience', 'Transaction history and details.', [
    'History list',
    'Txn detail',
  ]),
  p('features', 'rewards', 'growth', 'Coupons, cashback, scratch cards and referral screens.', [
    'Rewards screens',
  ]),
  p('features', 'goals', 'growth', 'Savings goal screens.', ['Goal screens']),
  p('features', 'cards', 'payments', 'Virtual card screens.', ['Card screens']),
  p('features', 'bills', 'payments', 'Bill pay and recharge screens.', ['Bill screens']),
  p('features', 'settings', 'experience', 'Settings and language.', ['Settings screens']),
  p('features', 'help-centre', 'mobile-infra', 'Help centre WebView screens.', ['Help screens']),
  p('features', 'qr', 'payments', 'QR scan and show.', ['QR screens']),
  p('features', 'contacts', 'experience', 'Contact list and picker.', ['Contact screens']),
  p('features', 'notifications-center', 'mobile-infra', 'In-app notification centre.', [
    'Notification list',
  ]),
  p('features', 'kyc', 'identity', 'KYC upgrade flow.', ['KYC screens']),
  p('features', 'security-centre', 'security', 'Devices, lock timeout and biometrics settings.', [
    'Security screens',
  ]),
  p('features', 'debug-menu', 'mobile-infra', 'Developer-only debug menu.', ['Debug panels']),

  // side: design system, L5 apps, harness, tools
  p('design-system', 'design-system', 'experience', 'Tokens, primitives and components.', [
    'Tokens',
    'Text, Button, Input, Sheet, Toast, ListRow, AmountInput, PinPad',
  ]),
  p('apps', 'mobile', 'mobile-infra', 'Expo Router application shell.', [
    'Routes',
    'Providers and bootstrapping',
  ]),
  p('apps', 'storybook-lite', 'experience', 'Screen gallery for manual QA.', ['Gallery shell']),
  p('harness', 'harness', 'platform-core', 'Test kit given to students.', [
    'Fake clock',
    'Emitters',
    'Storage mock',
    'Render helpers',
    'Chaos controls',
    'Scenarios',
  ]),
  p('tools', 'tools', 'mobile-infra', 'Generators, injector, LOC report and export checks.', [
    'gen',
    'inject',
    'loc',
    'checks',
  ]),
];
