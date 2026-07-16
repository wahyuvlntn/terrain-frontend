import chroma from 'chroma-js';

import { TColors } from './ref-colors';

export const findClosestColor = (
  hexcode: chroma.Color,
  referenceColors: TColors
) => {
  // Add DELTA key / value to array of objects
  const withDelta = referenceColors.map((color) => {
    return {
      ...color,
      shades: color.shades.map((shade) => ({
        ...shade,
        delta: chroma.deltaE(hexcode, shade.hexcode),
      })),
    };
  });

  // Calculate the lowest DELTA per color
  const lowestDelta = withDelta.map((color) => {
    return {
      ...color,
      closestShade: color.shades.reduce((previous, current) =>
        previous.delta < current.delta ? previous : current
      ),
    };
  });

  // Calculate the color family with the lowest DELTA
  const closestColorFamily = lowestDelta.reduce((previous, current) =>
    previous.closestShade.delta < current.closestShade.delta
      ? previous
      : current
  );

  // Add lightness difference key / value to array of objects
  const withLightnessDiff = {
    ...closestColorFamily,
    shades: closestColorFamily.shades.map((shade) => ({
      ...shade,
      lightnessDiff: Math.abs(
        chroma(shade.hexcode).get('hsl.l') - chroma(hexcode).get('hsl.l')
      ),
    })),
  };

  return {
    ...withLightnessDiff,
    closestShadeLightness: withLightnessDiff.shades.reduce(
      (previous, current) =>
        previous.lightnessDiff < current.lightnessDiff ? previous : current
    ),
  };
};
