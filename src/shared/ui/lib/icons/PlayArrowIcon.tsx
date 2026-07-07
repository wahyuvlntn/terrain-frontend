import type { SVGProps } from 'react';

const SvgPlayArrowIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="play_arrow-icon_svg__a"
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
    <g mask="url(#play_arrow-icon_svg__a)">
      <path fill="#fff" d="M8.5 18.097V5.903L18.077 12zM10 15.35 15.27 12 10 8.65z" />
    </g>
  </svg>
);
export default SvgPlayArrowIcon;
