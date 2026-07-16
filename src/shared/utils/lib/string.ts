export const convertToPascalCase = (str: string) => {
  if (str === '') return str;

  return str[0].toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
