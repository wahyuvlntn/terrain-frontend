import type { SVGProps } from 'react';

const SvgSaveIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="save-icon_svg__a"
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
    <g mask="url(#save-icon_svg__a)">
      <path
        fill="#fff"
        d="M20.5 7.212v11.48q0 .758-.525 1.283t-1.283.525H5.308q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h11.48zM19 7.85 16.15 5H5.308a.3.3 0 0 0-.221.087.3.3 0 0 0-.087.22v13.385a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087h13.385a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22zm-7 9.42a2.4 2.4 0 0 0 1.77-.732 2.4 2.4 0 0 0 .73-1.769A2.4 2.4 0 0 0 13.77 13a2.4 2.4 0 0 0-1.77-.73 2.4 2.4 0 0 0-1.77.73 2.4 2.4 0 0 0-.73 1.77q0 1.037.73 1.768a2.4 2.4 0 0 0 1.77.731M6.385 9.884h8.211v-3.5H6.385z"
      />
    </g>
  </svg>
);
export default SvgSaveIcon;
