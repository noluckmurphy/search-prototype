export type StoreListener<T> = (state: T) => void;
export type StoreUpdater<T> = (state: T) => T;

export interface Store<T> {
  getState(): T;
  setState(updater: Partial<T> | StoreUpdater<T>): void;
  subscribe(listener: StoreListener<T>): () => void;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<StoreListener<T>>();

  const getState = () => state;

  const setState: Store<T>['setState'] = (updater) => {
    const nextState =
      typeof updater === 'function'
        ? (updater as StoreUpdater<T>)(state)
        : ({ ...state, ...(updater as Partial<T>) } as T);

    if (Object.is(nextState, state)) {
      return;
    }

    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  const subscribe: Store<T>['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
}
