import type { SVGProps } from 'react';

const SvgCheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="check-icon_svg__a"
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
    <g mask="url(#check-icon_svg__a)">
      <path
        fill="#fff"
        d="M9.55 17.653 4.215 12.32l1.07-1.07 4.265 4.266 9.165-9.165 1.07 1.069z"
      />
    </g>
  </svg>
);
export default SvgCheckIcon;
