import { BadRequestException } from '@nestjs/common';

/** Untrusted object received at an application boundary. */
export type UnknownRecord = Record<string, unknown>;

export const readOptionalString = (input: UnknownRecord, field: string) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value.trim();
};

export const readRequiredString = (
  input: UnknownRecord,
  field: string,
): string => {
  const value = readOptionalString(input, field);
  if (!value) throw new BadRequestException(`${field} is required`);
  return value;
};

export const readString = (input: UnknownRecord, field: string): string => {
  const value = input[field];
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return value;
};

export const readOptionalStringAllowEmpty = (
  input: UnknownRecord,
  field: string,
) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  return value;
};

export const readOptionalBoolean = (input: UnknownRecord, field: string) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${field} must be a boolean`);
  }
  return value;
};

export const readBoolean = (input: UnknownRecord, field: string): boolean => {
  const value = readOptionalBoolean(input, field);
  if (value === undefined)
    throw new BadRequestException(`${field} is required`);
  return value;
};

export const readOptionalInteger = (
  input: UnknownRecord,
  field: string,
  minimum: number,
  maximum: number,
) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new BadRequestException(
      `${field} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
};

export const readInteger = (
  input: UnknownRecord,
  field: string,
  minimum: number,
  maximum: number,
): number => {
  const value = readOptionalInteger(input, field, minimum, maximum);
  if (value === undefined)
    throw new BadRequestException(`${field} is required`);
  return value;
};

export const readOptionalNumber = (
  input: UnknownRecord,
  field: string,
  minimum?: number,
  maximum?: number,
) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new BadRequestException(`${field} must be a valid number`);
  }
  return value;
};

export const readNumber = (
  input: UnknownRecord,
  field: string,
  minimum?: number,
  maximum?: number,
): number => {
  const value = readOptionalNumber(input, field, minimum, maximum);
  if (value === undefined)
    throw new BadRequestException(`${field} is required`);
  return value;
};

export const readOptionalStringArray = (
  input: UnknownRecord,
  field: string,
  maximum = 100,
): readonly string[] | undefined => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximum ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    throw new BadRequestException(`${field} must be a non-empty string array`);
  }
  return value.map((item: string) => item.trim());
};

export const readStringArray = (
  input: UnknownRecord,
  field: string,
  maximum = 100,
): readonly string[] => {
  const value = readOptionalStringArray(input, field, maximum);
  if (!value) throw new BadRequestException(`${field} is required`);
  return value;
};

export const readOptionalIntegerArray = (
  input: UnknownRecord,
  field: string,
  minimum: number,
  maximum: number,
): readonly number[] | undefined => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (item) =>
        typeof item !== 'number' ||
        !Number.isInteger(item) ||
        item < minimum ||
        item > maximum,
    )
  ) {
    throw new BadRequestException(`${field} must be a non-empty integer array`);
  }
  return value as number[];
};

export const readOptionalEnum = <const T extends readonly string[]>(
  input: UnknownRecord,
  field: string,
  values: T,
): T[number] | undefined => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new BadRequestException(
      `${field} must be one of: ${values.join(', ')}`,
    );
  }
  return value as T[number];
};

export const readEnum = <const T extends readonly string[]>(
  input: UnknownRecord,
  field: string,
  values: T,
): T[number] => {
  const value = readOptionalEnum(input, field, values);
  if (!value) throw new BadRequestException(`${field} is required`);
  return value;
};

export const readOptionalEnumArray = <const T extends readonly string[]>(
  input: UnknownRecord,
  field: string,
  values: T,
): readonly T[number][] | undefined => {
  const items = readOptionalStringArray(input, field, values.length);
  if (!items) return undefined;
  if (
    new Set(items).size !== items.length ||
    items.some((item) => !values.includes(item))
  ) {
    throw new BadRequestException(
      `${field} must contain unique values from: ${values.join(', ')}`,
    );
  }
  return items as readonly T[number][];
};

export const readApproval = (input: UnknownRecord): true => {
  if (input.approved !== true)
    throw new BadRequestException('approved must be true');
  return true;
};

export const readOptionalRecord = (input: UnknownRecord, field: string) => {
  const value = input[field];
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
};

export const parseHttpUrl = (value: string, field: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException(`${field} must be a valid absolute URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException(`${field} must use HTTP or HTTPS`);
  }
  return url.toString();
};

export const readHttpUrl = (input: UnknownRecord, field: string): string =>
  parseHttpUrl(readRequiredString(input, field), field);

export const readTabTarget = (input: UnknownRecord): { tabId?: string } => ({
  tabId: readOptionalString(input, 'tabId'),
});
