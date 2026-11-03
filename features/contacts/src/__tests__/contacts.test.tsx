import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { createTestApp, renderWithApp } from '@pp/harness';
import {
  ContactsScreen,
  normalizePhone,
  searchContacts,
  sectionContacts,
  useContactPicker,
} from '../index';
import { useContactPickerStore } from '../state/picker';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

afterEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockParams = {};
  useContactPickerStore.getState().clear();
});

const contact = (name: string, phone: string, favourite = false) =>
  ({ id: name, name, phone, favourite, avatarColor: '#000' }) as never;

describe('contact helpers', () => {
  it('normalises phone numbers', () => {
    expect(normalizePhone('98123 45678')).toBe('+919812345678');
    expect(normalizePhone('+91 98123-45678')).toBe('+919812345678');
    expect(normalizePhone('919812345678')).toBe('+919812345678');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('5812345678')).toBeNull();
  });

  it('searches by name and by digits of the number', () => {
    const list = [contact('Asha', '+919812345678'), contact('Bimal', '+919700000001')];
    expect(searchContacts(list, 'ash')).toHaveLength(1);
    expect(searchContacts(list, '0000')).toHaveLength(1);
    expect(searchContacts(list, '')).toHaveLength(2);
  });

  it('puts favourites first and sorts by name', () => {
    const sections = sectionContacts([
      contact('Zoya', '+919800000001'),
      contact('Asha', '+919800000002', true),
      contact('Bimal', '+919800000003'),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['favourites', 'all']);
    expect(sections[1]?.data.map((c) => c.name)).toEqual(['Bimal', 'Zoya']);
  });
});

describe('ContactsScreen', () => {
  it('lists contacts and filters with the search box', async () => {
    const app = await createTestApp();
    await renderWithApp(<ContactsScreen />, { app });
    const rows = await screen.findAllByTestId(/^contact-/);
    expect(rows.length).toBeGreaterThan(5);
    await fireEvent.changeText(screen.getByTestId('contacts-search'), 'zzzz-nobody');
    expect(await screen.findByText('No contacts match your search')).toBeTruthy();
    app.dispose();
  });

  it('opens the send screen with the contact phone', async () => {
    const app = await createTestApp();
    await renderWithApp(<ContactsScreen />, { app });
    const [row] = await screen.findAllByTestId(/^contact-/);
    await fireEvent.press(row as NonNullable<typeof row>);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/send',
      params: { to: expect.stringMatching(/^\+91\d{10}$/) },
    });
    app.dispose();
  });

  it('returns the selection in pick mode', async () => {
    mockParams = { mode: 'pick' };
    const app = await createTestApp();
    await renderWithApp(<ContactsScreen />, { app });
    const [row] = await screen.findAllByTestId(/^contact-/);
    await fireEvent.press(row as NonNullable<typeof row>);
    expect(mockBack).toHaveBeenCalled();
    expect(useContactPickerStore.getState().selection).not.toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    app.dispose();
  });

  it('adds a contact, validating the number first', async () => {
    const app = await createTestApp();
    await renderWithApp(<ContactsScreen />, { app });
    await screen.findAllByTestId(/^contact-/);
    await fireEvent.press(screen.getByTestId('add-contact'));
    await fireEvent.changeText(screen.getByTestId('contact-name'), 'Nikhil Verma');
    await fireEvent.changeText(screen.getByTestId('contact-phone'), '123');
    await fireEvent.press(screen.getByTestId('contact-save'));
    expect(await screen.findByText('Enter a valid 10-digit mobile number')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('contact-phone'), '98765 43210');
    await fireEvent.press(screen.getByTestId('contact-save'));
    await waitFor(() => expect(screen.getByText('Contact added')).toBeTruthy());
    const profile = app.container.resolve(PROFILE_SERVICE);
    expect((await profile.getContacts()).some((c) => c.phone === '+919876543210')).toBe(true);
    app.dispose();
  });
});

describe('useContactPicker', () => {
  it('opens the picker route and exposes the selection', async () => {
    const app = await createTestApp();
    function Probe() {
      const picker = useContactPicker();
      return (
        <Text testID="probe" onPress={picker.open}>
          {picker.selection?.name ?? 'none'}
        </Text>
      );
    }
    await renderWithApp(<Probe />, { app });
    await fireEvent.press(screen.getByTestId('probe'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/contacts', params: { mode: 'pick' } });
    expect(screen.getByTestId('probe').props.children).toBe('none');
    app.dispose();
  });
});
