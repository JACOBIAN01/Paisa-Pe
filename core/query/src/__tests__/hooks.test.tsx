import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';
import { QueryClientProvider, createQueryClient, keys, useMutation, useQuery } from '../index';

const setup = () => {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
};

describe('useQuery', () => {
  it('fetches on mount and exposes the result', async () => {
    const { wrapper } = setup();
    const fn = jest.fn(async () => 'hello');
    const { result } = await renderHook(() => useQuery({ key: keys.profile('u1'), fn }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toBe('hello'));
    expect(result.current.status).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const { wrapper } = setup();
    const fn = jest.fn(async () => 1);
    const { result } = await renderHook(
      () => useQuery({ key: keys.profile('u1'), fn, enabled: false }),
      { wrapper },
    );
    expect(fn).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('switches data when the key (user) changes', async () => {
    const { wrapper } = setup();
    const { result, rerender } = await renderHook(
      ({ user }: { user: string }) =>
        useQuery({ key: keys.balance(user), fn: async () => `balance-of-${user}` }),
      { wrapper, initialProps: { user: 'u1' } },
    );
    await waitFor(() => expect(result.current.data).toBe('balance-of-u1'));
    await rerender({ user: 'u2' });
    expect(result.current.data).not.toBe('balance-of-u1');
    await waitFor(() => expect(result.current.data).toBe('balance-of-u2'));
  });

  it('calls the latest fetcher on refetch without needing it as a dependency', async () => {
    const { wrapper } = setup();
    const { result, rerender } = await renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuery({ key: keys.profile('u1'), fn: async () => `v-${suffix}`, staleMs: Infinity }),
      { wrapper, initialProps: { suffix: 'a' } },
    );
    await waitFor(() => expect(result.current.data).toBe('v-a'));
    await rerender({ suffix: 'b' });
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toBe('v-b');
  });

  it('shares the cache between hooks and refetches when invalidated', async () => {
    const { client, wrapper } = setup();
    let n = 0;
    const fn = async () => ++n;
    const { result } = await renderHook(
      () => useQuery({ key: keys.balance('u1'), fn, staleMs: Infinity }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    await act(async () => {
      client.invalidate(keys.user('u1'));
    });
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('throws without a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      renderHook(() => useQuery({ key: keys.profile('u1'), fn: async () => 1 })),
    ).rejects.toThrow('QueryClientProvider');
    jest.restoreAllMocks();
  });
});

describe('useMutation', () => {
  it('runs callbacks in order and invalidates on success', async () => {
    const { client, wrapper } = setup();
    const order: string[] = [];
    client.setQueryData<number>(keys.balance('u1'), 100);
    const { result } = await renderHook(
      () =>
        useMutation<number, number, string>({
          fn: async (n) => n * 2,
          onMutate: () => {
            order.push('mutate');
            return 'ctx';
          },
          onSuccess: (data, _vars, ctx) => void order.push(`success:${data}:${ctx}`),
          onSettled: () => void order.push('settled'),
          invalidates: [keys.balance('u1')],
        }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(21);
    });
    expect(order).toEqual(['mutate', 'success:42:ctx', 'settled']);
    expect(result.current).toMatchObject({ status: 'success', data: 42 });
    expect(client.getSnapshot(keys.balance('u1')).isInvalidated).toBe(true);
  });

  it('rolls back an optimistic update on failure and keeps concurrent credits', async () => {
    const { client, wrapper } = setup();
    const key = keys.balance('u1');
    client.setQueryData<number>(key, 1000);
    const { result } = await renderHook(
      () =>
        useMutation<void, number, { undo(): void }>({
          fn: async () => {
            client.setQueryData<number>(key, (old) => (old ?? 0) + 500);
            throw new Error('declined');
          },
          onMutate: (amount) => ({
            undo: client.optimisticUpdate<number>(key, (old) => (old ?? 0) - amount),
          }),
          onError: (_e, _v, ctx) => ctx?.undo(),
          invalidates: [key],
        }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(300).catch(() => undefined);
    });
    expect(result.current.status).toBe('error');
    expect(client.getQueryData(key)).toBe(1500);
  });

  it('reports errors via mutate without an unhandled rejection', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(
      () => useMutation<void, void>({ fn: () => Promise.reject(new Error('no')) }),
      { wrapper },
    );
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect((result.current.error as Error).message).toBe('no');
    await act(async () => result.current.reset());
    expect(result.current.status).toBe('idle');
  });

  it('does not update state after unmount', async () => {
    const { wrapper } = setup();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let finish: () => void = () => undefined;
    const { result, unmount } = await renderHook(
      () =>
        useMutation<void, void>({
          fn: () => new Promise<void>((resolve) => void (finish = resolve)),
        }),
      { wrapper },
    );
    let done: Promise<void> = Promise.resolve();
    await act(async () => {
      done = result.current.mutateAsync();
    });
    await unmount();
    finish();
    await done;
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
