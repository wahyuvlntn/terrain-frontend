import type { SVGProps } from 'react';

const SvgArrowForwardIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="arrow_forward-icon_svg__a"
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
    <g mask="url(#arrow_forward-icon_svg__a)">
      <path
        fill="#fff"
        d="M16.627 12.75H4.5v-1.5h12.127L10.93 5.554 12 4.5l7.5 7.5-7.5 7.5-1.07-1.054z"
      />
    </g>
  </svg>
);
export default SvgArrowForwardIcon;
