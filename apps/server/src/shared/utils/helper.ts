import { createHash, timingSafeEqual } from 'crypto';
import { isDeepStrictEqual } from 'node:util';

export type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const readStringProperty = (
  value: unknown,
  key: string,
): string | undefined =>
  isRecord(value) && typeof value[key] === 'string' ? value[key] : undefined;

export const readBooleanProperty = (
  value: unknown,
  key: string,
): boolean | undefined =>
  isRecord(value) && typeof value[key] === 'boolean' ? value[key] : undefined;

export const stableStringify = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const redactProperties = (
  value: unknown,
  propertyNames: ReadonlySet<string>,
  replacement = '[REDACTED]',
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactProperties(item, propertyNames, replacement),
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        propertyNames.has(key)
          ? replacement
          : redactProperties(item, propertyNames, replacement),
      ]),
    );
  }
  return value;
};

export const readPath = (root: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current, part) => (isRecord(current) ? current[part] : undefined),
      root,
    );

export const isNonEmpty = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
};

export const containsValue = (value: unknown, expected: unknown): boolean => {
  if (typeof value === 'string' && typeof expected === 'string') {
    return value.includes(expected);
  }
  return Array.isArray(value)
    ? value.some((item) => isDeepStrictEqual(item, expected))
    : false;
};

export const describeValue = (value: unknown, maximumLength = 500): string => {
  const serialized = JSON.stringify(value);
  return (serialized ?? String(value)).slice(0, maximumLength);
};

export const truncateText = (value: string, maximumLength: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maximumLength
    ? `${normalized.slice(0, maximumLength - 1).trimEnd()}…`
    : normalized;
};

export const numberOrUndefined = (number: string | number) => {
  if (typeof number === 'number' || typeof number === 'undefined')
    return number;
  if (isNaN(Number(number))) return undefined;
  return Number(number);
};

export const getLimitAndSkip = (limit?: number, currentPage?: number) => {
  const take = numberOrUndefined(limit) || 10;
  const page = numberOrUndefined(currentPage) || 1;
  const skip = (page - 1) * take;

  return { skip, take };
};

export const paginateResponse = <T>(
  data: [result: T[], total: number],
  page: number,
  limit: number,
) => {
  const l = numberOrUndefined(limit) || 10;
  const p = numberOrUndefined(page) || 1;
  const [result, total] = data;
  const lastPage = Math.ceil(total / l);
  const nextPage = p + 1 > lastPage ? null : p + 1;
  const prevPage = p - 1 < 1 ? null : p - 1;
  return {
    data: [...result],
    page: p,
    total,
    nextPage: nextPage,
    prevPage: prevPage,
    lastPage: lastPage,
  };
};

export const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const optionalInt = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid number`);
  }

  return parsed;
};

export const normalizeEmail = (email: string) => email.toLowerCase().trim();

export const getAuthCodeKey = (email: string) => `auth-code:${email}`;

export const getRefreshTokenKey = (sessionId: string) =>
  `refresh-token:${sessionId}`;

export const getExtensionAuthorizationCodeKey = (code: string) =>
  `extension-auth-code:${hashToken(code)}`;

export const getExtensionRefreshTokenKey = (token: string) =>
  `extension-refresh-token:${hashToken(token)}`;

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const hashAuthCode = (email: string, code: string, secret: string) =>
  createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex');

export const isHashMatch = (expectedHash: string, actualHash: string) => {
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const getWordsList = (value: string): string[] => {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
};
