import { useState, useCallback } from 'react';

export type Updater<T> = (current: T) => T;
export type SetStateAction<T> = T | Updater<T>;

export function useFunctionalState<T>(
  initialState: T | (() => T)
): [T, (updater: SetStateAction<T>) => void] {
  const [state, setState] = useState(initialState);

  const setFunctionalState = useCallback((updater: SetStateAction<T>) => {
    setState(currentState => 
      typeof updater === 'function' 
        ? (updater as Updater<T>)(currentState)
        : updater
    );
  }, []);

  return [state, setFunctionalState];
}

export function useImmerState<T>(
  initialState: T | (() => T)
): [T, (updater: (draft: T) => void | T) => void] {
  const [state, setState] = useState(initialState);

  const setImmerState = useCallback((updater: (draft: T) => void | T) => {
    setState(currentState => {
      const draft = { ...currentState };
      const result = updater(draft);
      return result || draft;
    });
  }, []);

  return [state, setImmerState];
}

export function useReducerState<T, A>(
  reducer: (state: T, action: A) => T,
  initialState: T
): [T, (action: A) => void] {
  const [state, setState] = useState(initialState);

  const dispatch = useCallback((action: A) => {
    setState(currentState => reducer(currentState, action));
  }, [reducer]);

  return [state, dispatch];
}

export function createReducer<T, A>(
  handlers: Record<string, (state: T, action: any) => T>
) {
  return (state: T, action: A): T => {
    const handler = handlers[(action as any).type];
    return handler ? handler(state, action) : state;
  };
}

export function useStore<T>(
  initialState: T
): {
  state: T;
  dispatch: (action: (currentState: T) => T) => void;
  subscribe: (listener: (state: T) => void) => () => void;
} {
  const [state, setState] = useState(initialState);
  const listeners = new Set<(state: T) => void>();

  const dispatch = useCallback((action: (currentState: T) => T) => {
    setState(currentState => {
      const newState = action(currentState);
      listeners.forEach(listener => listener(newState));
      return newState;
    });
  }, []);

  const subscribe = useCallback((listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return {
    state,
    dispatch,
    subscribe
  };
}

export function pipeState<T>(...operations: Array<(state: T) => T>) {
  return (initialState: T): T => 
    operations.reduce((state, operation) => operation(state), initialState);
}

export function composeState<T>(...operations: Array<(state: T) => T>) {
  return (initialState: T): T => 
    operations.reduceRight((state, operation) => operation(state), initialState);
}