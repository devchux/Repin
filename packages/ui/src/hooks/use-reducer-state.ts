import { Dispatch, useReducer } from 'react';

export function useReducerState<T>(
  defaultValues: T
): [T & Partial<T>, Dispatch<Partial<T>>, () => void] {
  const state = useReducer(
    (prev: T, next: Partial<T>) => ({ ...prev, ...next }),
    defaultValues
  );
  const reset = () => state[1](defaultValues);

  return [...state, reset];
}