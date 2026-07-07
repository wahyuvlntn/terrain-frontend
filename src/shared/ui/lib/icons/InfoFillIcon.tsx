import type { SVGProps } from 'react';

const SvgInfoFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="info-fill-icon_svg__a"
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
    <g mask="url(#info-fill-icon_svg__a)">
      <path
        fill="#fff"
        d="M11.25 16.75h1.5V11h-1.5zM12 9.288q.343 0 .575-.232a.78.78 0 0 0 .233-.575.78.78 0 0 0-.232-.576.78.78 0 0 0-.576-.232.78.78 0 0 0-.575.232.78.78 0 0 0-.233.576q0 .343.232.575a.78.78 0 0 0 .576.232m.002 12.212a9.3 9.3 0 0 1-3.705-.748 9.6 9.6 0 0 1-3.018-2.03 9.6 9.6 0 0 1-2.03-3.016 9.2 9.2 0 0 1-.749-3.704q0-1.972.748-3.705a9.6 9.6 0 0 1 2.03-3.018 9.6 9.6 0 0 1 3.016-2.03 9.2 9.2 0 0 1 3.704-.749q1.972 0 3.705.748a9.6 9.6 0 0 1 3.018 2.03 9.6 9.6 0 0 1 2.03 3.016 9.2 9.2 0 0 1 .749 3.704q0 1.972-.748 3.705a9.6 9.6 0 0 1-2.03 3.018 9.6 9.6 0 0 1-3.016 2.03 9.2 9.2 0 0 1-3.704.749"
      />
    </g>
  </svg>
);
export default SvgInfoFillIcon;
