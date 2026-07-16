import chroma from 'chroma-js';

import { findClosestColor } from './find-closest-color';
import { colors, TColors } from './ref-colors';

export const generateColorFamily = (
  hexcodeStr: string,
  referenceColors: TColors = colors
) => {
  const hexcode = chroma.hex(hexcodeStr);
  const closestColorFamily = findClosestColor(hexcode, referenceColors);

  const inputHue = chroma(hexcode).get('hsl.h');
  const matchHue = chroma(closestColorFamily.closestShadeLightness.hexcode).get(
    'hsl.h'
  );

  let hueDifference: string | number = inputHue - (matchHue || 0);

  const saturationRatio =
    chroma(hexcode).get('hsl.s') /
    chroma(closestColorFamily.closestShadeLightness.hexcode).get('hsl.s');

  if (hueDifference == 0) {
    hueDifference = matchHue.toString();
  } else if (hueDifference > 0) {
    hueDifference = '+' + hueDifference;
  } else {
    hueDifference = hueDifference.toString();
  }

  return closestColorFamily.shades.map((color) => {
    let newColor = color.hexcode;
    const newSaturation = chroma(newColor).get('hsl.s') * saturationRatio || 1;

    newColor = chroma(newColor).set('hsl.s', newSaturation).hex();
    newColor = chroma(newColor).set('hsl.h', hueDifference).hex();

    if (closestColorFamily.closestShadeLightness.number == color.number) {
      newColor = chroma(hexcode).hex();
    }

    return {
      number: color.number,
      hexCode: newColor,
    };
  });
};
