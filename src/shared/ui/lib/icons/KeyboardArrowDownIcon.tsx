import type { SVGProps } from 'react';

const SvgKeyboardArrowDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="keyboard_arrow_down-icon_svg__a"
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
    <g mask="url(#keyboard_arrow_down-icon_svg__a)">
      <path
        fill="currentColor"
        d="m11.7 13.247 4.6-4.6L17.352 9.7 11.7 15.354 6.046 9.7l1.053-1.054z"
      />
    </g>
  </svg>
);
export default SvgKeyboardArrowDownIcon;
