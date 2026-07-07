import type { SVGProps } from 'react';

const SvgCircleFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="circle-fill-icon_svg__a"
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
    <g mask="url(#circle-fill-icon_svg__a)">
      <circle cx={12} cy={12} r={5.25} fill="#fff" stroke="#fff" strokeWidth={1.5} />
    </g>
  </svg>
);
export default SvgCircleFillIcon;
