// Function to use translation outside of components
import i18next from 'i18next';

// function to construct string with optional parameter
// optional parameter position denoted by {{$1}}, {{$2}}, and so on
export function stringBuilder(template: string, ...params: string[]) {
  return template.replace(/\{\{\$(\d+)\}\}/g, (match, number) => {
    return typeof params[number - 1] !== 'undefined'
      ? params[number - 1]
      : match;
  });
}

// This function allows for translation of text outside of a React component context.
// It uses the i18next library to translate the given key with optional interpolation options.
export const t = (key: string, ...params: string[]) => {
  return stringBuilder(i18next.t(key), ...params);
};

// Transform a string to a valid translation key for i18next
export const createTranslationKey = (translationString: string) => {
  return translationString.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Checks if a given sentence matches a specified pattern and extracts dynamic values.
 *
 * @param sentence - The input sentence to be analyzed.
 * @param pattern - The pattern to match against, using {{$n}} as placeholders for dynamic values.
 * @returns A tuple containing:
 *          - A boolean indicating whether the sentence matches the pattern.
 *          - An array of strings representing the extracted dynamic values.
 */
export const matchSentenceAndExtractValues = (
  sentence: string,
  pattern: string
): [boolean, string[]] => {
  // Convert the pattern into a regular expression
  const regexPattern = pattern
    .replace(/\{\{\$(\d+)\}\}/g, () => {
      // Replace each {{$n}} with a capture group that matches one or more non-whitespace characters,
      // potentially separated by spaces
      return `((?:\\S+\\s+)*\\S+)`;
    })
    .replace(/ /g, '\\s+'); // Allow flexible whitespace between words

  // Create a regex object, anchoring the pattern to the start and end of the string
  const regex = new RegExp(`^${regexPattern}$`);

  // Attempt to match the sentence against the regex
  const match = sentence.match(regex);

  if (match) {
    // If there's a match, return true and the captured groups (excluding the full match at index 0)
    return [true, match.slice(1)];
  }

  // If there's no match, return false and an empty array
  return [false, []];
};

// function to lowercase all and swap whitespace with underscore
export const formatKeyTranslation = (key: string) => {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
};

export const getMessageTranslation = (message: string) => {
  const splittedData = message.split(':');
  const key =
    splittedData.length > 1 ? formatKeyTranslation(splittedData[1]) : message;
  if (i18next.exists(`common.${key}`)) {
    return t(`common.${key.toLowerCase()}`, ...splittedData.slice(2));
  } else {
    return message;
  }
};

export const getErrorTranslation = (error: Error) => {
  const splittedData = error.message.split(':');

  if (splittedData.length === 1) {
    const key = formatKeyTranslation(splittedData[0]);
    if (i18next.exists(`common.${key}`)) {
      return t(`common.${key.toLowerCase()}`);
    }
  } else {
    const key = formatKeyTranslation(splittedData[1]);
    if (i18next.exists(`common.${key}`)) {
      return t(`common.${key.toLowerCase()}`, ...splittedData.slice(2));
    }
  }
  return error.message;
};
