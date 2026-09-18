import {
  containsValue,
  describeValue,
  isNonEmpty,
  isRecord,
  readBooleanProperty,
  readPath,
  readStringProperty,
  redactProperties,
  stableStringify,
  truncateText,
} from './helper';

describe('shared helpers', () => {
  it('reads typed properties from unknown records', () => {
    const value: unknown = { name: 'Repin', active: true, count: 1 };

    expect(isRecord(value)).toBe(true);
    expect(readStringProperty(value, 'name')).toBe('Repin');
    expect(readStringProperty(value, 'count')).toBeUndefined();
    expect(readBooleanProperty(value, 'active')).toBe(true);
  });

  it('serializes records with stable key ordering', () => {
    expect(stableStringify({ z: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"z":1}',
    );
  });

  it('redacts configured properties recursively', () => {
    expect(
      redactProperties(
        { text: 'secret', nested: [{ text: 'also secret', value: 1 }] },
        new Set(['text']),
      ),
    ).toEqual({
      text: '[REDACTED]',
      nested: [{ text: '[REDACTED]', value: 1 }],
    });
  });

  it('supports generic value inspection', () => {
    const value = { result: { items: [{ id: 1 }] } };

    expect(readPath(value, 'result.items')).toEqual([{ id: 1 }]);
    expect(isNonEmpty(readPath(value, 'result.items'))).toBe(true);
    expect(containsValue(readPath(value, 'result.items'), { id: 1 })).toBe(
      true,
    );
    expect(describeValue(value, 12)).toHaveLength(12);
  });

  it('normalizes and truncates text', () => {
    expect(truncateText('  Repin   browser assistant  ', 14)).toBe(
      'Repin browser…',
    );
  });
});
