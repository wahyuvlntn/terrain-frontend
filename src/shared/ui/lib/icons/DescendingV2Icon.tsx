import type { SVGProps } from 'react';

const SvgDescendingV2Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="descending_-_v2-icon_svg__a"
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
    <g fill="currentColor" mask="url(#descending_-_v2-icon_svg__a)">
      <path d="m12.173 16.673 1.054-1.069 2.85 2.85V3.327h1.5v15.127l2.85-2.85 1.054 1.07-4.654 4.653z" />
      <path
        d="m12.827 7.981-1.054 1.07-2.85-2.85v15.126h-1.5V6.2l-2.85 2.85L3.52 7.981l4.654-4.654z"
        opacity={0.3}
      />
    </g>
  </svg>
);
export default SvgDescendingV2Icon;
