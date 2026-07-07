import type { SVGProps } from 'react';

const SvgKeyboardArrowUpIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="keyboard_arrow_up-icon_svg__a"
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
    <g mask="url(#keyboard_arrow_up-icon_svg__a)">
      <path fill="currentColor" d="m12 10.453-4.6 4.6L6.346 14 12 8.346l5.654 5.653-1.054 1.054z" />
    </g>
  </svg>
);
export default SvgKeyboardArrowUpIcon;
