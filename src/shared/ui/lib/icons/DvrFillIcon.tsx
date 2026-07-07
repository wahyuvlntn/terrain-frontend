import type { SVGProps } from 'react';

const SvgDvrFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="dvr-fill-icon_svg__a"
      width={24}
      height={24}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'alpha',
      }}
    >
      <path fill="currentColor" d="M0 0h24v24H0z" />
    </mask>
    <g mask="url(#dvr-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="M7 13.808q.343 0 .575-.232A.78.78 0 0 0 7.809 13a.78.78 0 0 0-.232-.575.78.78 0 0 0-.576-.233.78.78 0 0 0-.575.232.78.78 0 0 0-.233.576q0 .343.232.575a.78.78 0 0 0 .576.233m0-4q.343 0 .575-.232A.78.78 0 0 0 7.809 9a.78.78 0 0 0-.232-.575A.78.78 0 0 0 7 8.192a.78.78 0 0 0-.575.232.78.78 0 0 0-.233.576q0 .343.232.575A.78.78 0 0 0 7 9.809m2.058 3.942h8.692v-1.5H9.058zm0-4h8.692v-1.5H9.058zM8.5 20.5v-2H4.308q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T4.308 3.5h15.384q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525H15.5v2z"
      />
    </g>
  </svg>
);
export default SvgDvrFillIcon;
