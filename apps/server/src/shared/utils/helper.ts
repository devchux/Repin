import { createHash, timingSafeEqual } from 'crypto';

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

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const hashAuthCode = (email: string, code: string, secret: string) =>
  createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex');

export const isHashMatch = (expectedHash: string, actualHash: string) => {
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
