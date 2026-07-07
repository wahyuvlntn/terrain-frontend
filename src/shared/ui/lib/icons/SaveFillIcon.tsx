import type { SVGProps } from 'react';

const SvgSaveFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="save-fill-icon_svg__a"
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
    <g mask="url(#save-fill-icon_svg__a)">
      <path
        fill="#fff"
        d="M20.5 7.212v11.48q0 .758-.525 1.283t-1.283.525H5.308q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h11.48zm-8.502 10.057q1.04 0 1.771-.728.73-.729.731-1.77 0-1.04-.729-1.771a2.4 2.4 0 0 0-1.769-.73q-1.04 0-1.771.728a2.4 2.4 0 0 0-.731 1.769q0 1.04.729 1.771.728.732 1.769.731M6.385 9.885h8.211v-3.5H6.385z"
      />
    </g>
  </svg>
);
export default SvgSaveFillIcon;
