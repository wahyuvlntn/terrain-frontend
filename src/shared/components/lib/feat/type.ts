import { z } from 'zod';

export const ThresholdLessThanEnum = z.enum(['X < _', 'X <= _']);

export type ThresholdLessThanEnum = z.infer<typeof ThresholdLessThanEnum>;

export const ThresholdGreaterThanEnum = z.enum(['X > _', 'X >= _']);

export type ThresholdGreaterThanEnum = z.infer<typeof ThresholdGreaterThanEnum>;

export const ThresholdEnum = z.enum([
  ...ThresholdLessThanEnum.options,
  ...ThresholdGreaterThanEnum.options,
  'X > _ or X < _',
  'X >= _ or X < _',
  'X > _ or X <= _',
  'X >= _ or X <= _',
  '',
] as const);

export type ThresholdEnum = z.infer<typeof ThresholdEnum>;

export const ThresholdLessThanList = [
  { value: ThresholdLessThanEnum.enum['X < _'], label: '<' },
  { value: ThresholdLessThanEnum.enum['X <= _'], label: '<=' },
];

export const ThresholdGreaterThanList = [
  { value: ThresholdGreaterThanEnum.enum['X > _'], label: '>' },
  { value: ThresholdGreaterThanEnum.enum['X >= _'], label: '>=' },
];
