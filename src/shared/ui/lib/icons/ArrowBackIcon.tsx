import type { SVGProps } from 'react';

const SvgArrowBackIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="arrow_back-icon_svg__a"
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
    <g mask="url(#arrow_back-icon_svg__a)">
      <path
        fill="#fff"
        d="m7.373 12.75 5.696 5.696L12 19.5 4.5 12 12 4.5l1.07 1.054-5.697 5.696H19.5v1.5z"
      />
    </g>
  </svg>
);
export default SvgArrowBackIcon;
