import type { SVGProps } from 'react';

const SvgGridViewIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="grid_view-icon_svg__a"
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
    <g mask="url(#grid_view-icon_svg__a)">
      <path
        fill="#fff"
        d="M3.5 11V3.5H11V11zm0 9.5V13H11v7.5zM13 11V3.5h7.5V11zm0 9.5V13h7.5v7.5zm-8-11h4.5V5H5zm9.5 0H19V5h-4.5zm0 9.5H19v-4.5h-4.5zM5 19h4.5v-4.5H5z"
      />
    </g>
  </svg>
);
export default SvgGridViewIcon;
