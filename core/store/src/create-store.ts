import { create, type StateCreator, type StoreApi, type UseBoundStore } from 'zustand';

export type Store<T> = UseBoundStore<StoreApi<T>>;

export const createStore = <T>(initializer: StateCreator<T>): Store<T> => create<T>()(initializer);
