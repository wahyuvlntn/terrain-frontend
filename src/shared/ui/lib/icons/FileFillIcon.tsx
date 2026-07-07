import type { SVGProps } from 'react';

const SvgFileFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="file-fill-icon_svg__a"
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
    <g mask="url(#file-fill-icon_svg__a)">
      <path
        fill="#fff"
        d="M8.25 17.75h7.5v-1.5h-7.5zm0-4h7.5v-1.5h-7.5zM6.308 21.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V4.308q0-.758.525-1.283T6.308 2.5h7.942l5.25 5.25v11.942q0 .758-.525 1.283t-1.283.525zm7.192-13H18L13.5 4z"
      />
    </g>
  </svg>
);
export default SvgFileFillIcon;
