import type { SVGProps } from 'react';

const SvgImagesmodeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="imagesmode-icon_svg__a"
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
    <g mask="url(#imagesmode-icon_svg__a)">
      <path
        fill="currentColor"
        d="M5.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h13.384q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096m1.442-2.25h10.577l-3.289-4.385-2.807 3.654-2-2.557zm1.75-7q.519 0 .885-.365.365-.366.365-.885t-.365-.885A1.2 1.2 0 0 0 8.5 7.25q-.519 0-.885.365a1.2 1.2 0 0 0-.365.885q0 .519.365.885.366.365.885.365"
      />
    </g>
  </svg>
);
export default SvgImagesmodeIcon;
