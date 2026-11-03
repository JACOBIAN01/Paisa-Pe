import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryClient } from './client';
import type { QueryKey } from './key';
import { useQueryClient } from './provider';

export interface UseMutationOptions<TData, TVars, TContext> {
  fn: (vars: TVars) => Promise<TData>;
  /** Runs before `fn`. Its return value is passed to the other callbacks (e.g. a rollback). */
  onMutate?: (vars: TVars, client: QueryClient) => TContext | Promise<TContext>;
  onSuccess?: (data: TData, vars: TVars, context: TContext | undefined) => void | Promise<void>;
  onError?: (error: unknown, vars: TVars, context: TContext | undefined) => void | Promise<void>;
  onSettled?: (
    data: TData | undefined,
    error: unknown,
    vars: TVars,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Key prefixes to invalidate once the mutation settles, whether it succeeded or not. */
  invalidates?: QueryKey[] | ((data: TData | undefined, vars: TVars) => QueryKey[]);
}

type State<TData> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'pending'; data?: undefined; error?: undefined }
  | { status: 'success'; data: TData; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown };

export interface UseMutationResult<TData, TVars> {
  status: State<TData>['status'];
  data: TData | undefined;
  error: unknown;
  isPending: boolean;
  mutate(vars: TVars): void;
  mutateAsync(vars: TVars): Promise<TData>;
  reset(): void;
}

export function useMutation<TData, TVars = void, TContext = undefined>(
  options: UseMutationOptions<TData, TVars, TContext>,
): UseMutationResult<TData, TVars> {
  const client = useQueryClient();
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const latestRun = useRef(0);
  const [state, setState] = useState<State<TData>>({ status: 'idle' });

  const mutateAsync = useCallback(
    async (vars: TVars): Promise<TData> => {
      const run = ++latestRun.current;
      const update = (next: State<TData>): void => {
        if (mounted.current && run === latestRun.current) setState(next);
      };
      const opts = optionsRef.current;
      update({ status: 'pending' });

      let context: TContext | undefined;
      let data: TData | undefined;
      let failure: unknown;
      let failed = false;
      try {
        context = await opts.onMutate?.(vars, client);
        data = await opts.fn(vars);
        await opts.onSuccess?.(data, vars, context);
      } catch (error) {
        failed = true;
        failure = error;
        await opts.onError?.(error, vars, context);
      }

      const targets =
        typeof opts.invalidates === 'function' ? opts.invalidates(data, vars) : opts.invalidates;
      for (const target of targets ?? []) client.invalidate(target);
      await opts.onSettled?.(data, failure, vars, context);

      if (failed) {
        update({ status: 'error', error: failure });
        throw failure;
      }
      update({ status: 'success', data: data as TData });
      return data as TData;
    },
    [client],
  );

  const mutate = useCallback(
    (vars: TVars) => {
      mutateAsync(vars).catch(() => undefined);
    },
    [mutateAsync],
  );
  const reset = useCallback(() => {
    latestRun.current += 1;
    setState({ status: 'idle' });
  }, []);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    isPending: state.status === 'pending',
    mutate,
    mutateAsync,
    reset,
  };
}
