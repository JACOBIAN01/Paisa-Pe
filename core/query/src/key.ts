export type KeyPart = string | number | boolean | null;
export type QueryKey = readonly KeyPart[];

export const hashKey = (key: QueryKey): string => JSON.stringify(key);

export const keyFromHash = (hash: string): QueryKey => JSON.parse(hash) as QueryKey;

/** True when `key` starts with every element of `prefix`. */
export const startsWith = (key: QueryKey, prefix: QueryKey): boolean =>
  prefix.length <= key.length && prefix.every((part, index) => key[index] === part);
