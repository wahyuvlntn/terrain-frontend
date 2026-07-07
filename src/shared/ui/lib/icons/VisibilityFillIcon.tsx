import type { SVGProps } from 'react';

const SvgVisibilityFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="visibility-fill-icon_svg__a"
      width={24}
      height={24}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'alpha',
      }}
    >
      <path fill="#D9D9D9" d="M0 0h24v24H0z" />
    </mask>
    <g mask="url(#visibility-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="M12.002 15.577q1.7 0 2.887-1.19t1.188-2.89-1.19-2.886-2.89-1.188-2.886 1.19-1.188 2.89 1.19 2.886 2.89 1.188M12 14.2q-1.125 0-1.912-.787A2.6 2.6 0 0 1 9.3 11.5q0-1.125.787-1.913A2.6 2.6 0 0 1 12 8.8q1.125 0 1.912.787.788.789.788 1.913t-.787 1.912A2.6 2.6 0 0 1 12 14.2m.001 4.3q-3.45 0-6.286-1.903T1.538 11.5Q2.88 8.305 5.714 6.403T11.999 4.5q3.449 0 6.286 1.903 2.836 1.902 4.177 5.097-1.341 3.195-4.176 5.097T12 18.5"
      />
    </g>
  </svg>
);
export default SvgVisibilityFillIcon;
