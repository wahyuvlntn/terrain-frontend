import type { SVGProps } from 'react';

const SvgKeyboardArrowRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="keyboard_arrow_right-icon_svg__a"
      width={24}
      height={24}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'alpha',
      }}
    >
      <path fill="currentColor" d="M0 0h24v24H0z" />
    </mask>
    <g mask="url(#keyboard_arrow_right-icon_svg__a)">
      <path
        fill="currentColor"
        d="m12.946 12-4.6-4.6L9.4 6.346l5.654 5.653L9.4 17.654 8.346 16.6z"
      />
    </g>
  </svg>
);
export default SvgKeyboardArrowRightIcon;
