export const filterUnique = (
  value: unknown,
  index: number,
  array: unknown[]
) => {
  return array.indexOf(value) === index;
};
