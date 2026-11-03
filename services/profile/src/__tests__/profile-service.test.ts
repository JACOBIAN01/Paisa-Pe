import { scopedKey } from '@pp/core-storage';
import { DEFAULT_PREFERENCES } from '../profile-service';
import { createProfileRig } from './helpers';

describe('profile', () => {
  it('requires an active session', async () => {
    const rig = createProfileRig();
    await expect(rig.service.getProfile()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('fetches and caches the profile under the user scope', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    const user = await rig.service.getProfile();
    expect(user.name).toBe('Aarav Sharma');
    expect(await rig.service.getCachedProfile()).toEqual(user);
    expect(await rig.storage.keys()).toEqual([scopedKey('usr_001', 'profile.user')]);
  });

  it('serves the cached profile when the network is down', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    const user = await rig.service.getProfile();
    rig.server.chaos.failNext({ endpoint: 'profile.get' }, 5, { status: 503, retryable: true });
    rig.server.chaos.dropResponse({ endpoint: 'profile.get' }, 5);
    expect(await rig.service.getProfile()).toEqual(user);
  });

  it('rethrows when offline with nothing cached', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    rig.server.chaos.dropResponse({ endpoint: 'profile.get' }, 1);
    await expect(rig.service.getProfile()).rejects.toBeDefined();
  });

  it('does not mask server errors with the cache', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    await rig.service.getProfile();
    rig.server.chaos.failNext({ endpoint: 'profile.get' }, 1, {
      status: 403,
      code: 'forbidden',
      retryable: false,
    });
    await expect(rig.service.getProfile()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('updates the name, trims it and announces the change', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    const user = await rig.service.updateName('  Aarav S  ');
    expect(user.name).toBe('Aarav S');
    expect((await rig.service.getCachedProfile())?.name).toBe('Aarav S');
    expect(rig.events).toEqual([{ name: 'profile.changed', payload: { userId: 'usr_001' } }]);
  });
});

describe('contacts', () => {
  it('caches contacts per user', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    const first = await rig.service.getContacts();
    expect(first.length).toBeGreaterThanOrEqual(20);
    rig.signInAs('usr_002');
    expect(await rig.service.getCachedContacts()).toEqual([]);
    const second = await rig.service.getContacts();
    expect(second).not.toEqual(first);
    rig.signInAs('usr_001');
    expect(await rig.service.getCachedContacts()).toEqual(first);
  });

  it('adds a contact to the cache', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    await rig.service.getContacts();
    const contact = await rig.service.addContact({ name: 'New Friend', phone: '+919876543210' });
    const cached = await rig.service.getCachedContacts();
    expect(cached.filter((c) => c.id === contact.id)).toHaveLength(1);
  });

  it('writes a response to the user who asked, even after an account switch', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    rig.server.chaos.setLatency({ downlinkMs: 20 });
    const pending = rig.service.getContacts();
    rig.signInAs('usr_002');
    await pending;
    expect(await rig.service.getCachedContacts()).toEqual([]);
    rig.signInAs('usr_001');
    expect((await rig.service.getCachedContacts()).length).toBeGreaterThan(0);
  });
});

describe('preferences', () => {
  it('falls back to defaults before anything is cached', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    expect(await rig.service.getCachedPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips preferences and merges patches', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    const base = await rig.service.getPreferences();
    const next = await rig.service.updatePreferences({ lockTimeoutSec: 300, hideBalance: true });
    expect(next).toEqual({ ...base, lockTimeoutSec: 300, hideBalance: true });
    expect(await rig.service.getCachedPreferences()).toEqual(next);
    expect((await rig.service.getPreferences()).lockTimeoutSec).toBe(300);
    expect(rig.events).toHaveLength(1);
  });

  it('sets a full preferences object', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_002');
    const saved = await rig.service.setPreferences({ ...DEFAULT_PREFERENCES, language: 'hi' });
    expect(saved.language).toBe('hi');
  });

  it('keeps preferences separate per user', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    await rig.service.updatePreferences({ hideBalance: true });
    rig.signInAs('usr_002');
    expect((await rig.service.getCachedPreferences()).hideBalance).toBe(false);
  });
});

describe('clearUser', () => {
  it('removes only that user cache', async () => {
    const rig = createProfileRig();
    rig.signInAs('usr_001');
    await rig.service.getProfile();
    rig.signInAs('usr_002');
    await rig.service.getProfile();
    await rig.service.clearUser('usr_001');
    expect((await rig.storage.keys()).every((k) => k.startsWith('u:usr_002:'))).toBe(true);
  });
});
