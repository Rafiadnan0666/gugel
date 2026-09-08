// Functional utility functions for immutable data transformations

export const pipe = <T, U>(value: T, fn: (x: T) => U): U => fn(value);

export const flow = <T, U, V>(fn1: (x: T) => U, fn2: (x: U) => V) => (x: T): V => fn2(fn1(x));

export const map = <T, U>(fn: (x: T) => U) => (arr: readonly T[]): readonly U[] => 
  arr.map(fn);

export const filter = <T>(predicate: (x: T) => boolean) => (arr: readonly T[]): readonly T[] => 
  arr.filter(predicate);

export const reduce = <T, U>(fn: (acc: U, x: T) => U, initialValue: U) => 
  (arr: readonly T[]): U => arr.reduce(fn, initialValue);

export const sort = <T>(compareFn?: (a: T, b: T) => number) => (arr: readonly T[]): readonly T[] => 
  [...arr].sort(compareFn);

export const unique = <T>(arr: readonly T[]): readonly T[] => [...new Set(arr)];

export const groupBy = <T, K extends string>(
  keyFn: (item: T) => K
) => (arr: readonly T[]): Record<K, readonly T[]> => 
  arr.reduce((groups, item) => {
    const key = keyFn(item);
    return {
      ...groups,
      [key]: [...(groups[key] || []), item]
    };
  }, {} as Record<K, readonly T[]>);

export const flatten = <T>(arr: readonly T[][]): readonly T[] => arr.flat();

export const partition = <T>(
  predicate: (x: T) => boolean
) => (arr: readonly T[]): [readonly T[], readonly T[]] => 
  arr.reduce(
    ([truthy, falsy], item) => 
      predicate(item) 
        ? [[...truthy, item], falsy]
        : [truthy, [...falsy, item]],
    [[] as readonly T[], [] as readonly T[]]
  );

export const pick = <T extends object, K extends keyof T>(
  keys: readonly K[]
) => (obj: T): Pick<T, K> => 
  keys.reduce((picked, key) => ({ ...picked, [key]: obj[key] }), {} as Pick<T, K>);

export const omit = <T extends object, K extends keyof T>(
  keys: readonly K[]
) => (obj: T): Omit<T, K> => 
  Object.entries(obj)
    .filter(([key]) => !keys.includes(key as K))
    .reduce((result, [key, value]) => ({ ...result, [key]: value }), {} as Omit<T, K>);

export const memoize = <T extends readonly unknown[], R>(
  fn: (...args: T) => R
): ((...args: T) => R) => {
  const cache = new Map<string, R>();
  
  return (...args: T): R => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

export const curry = <A, B, C>(fn: (a: A, b: B) => C) => 
  (a: A) => 
  (b: B): C => fn(a, b);

export const compose = <T, U, V>(fn1: (x: U) => V, fn2: (x: T) => U) => 
  (x: T): V => fn1(fn2(x));