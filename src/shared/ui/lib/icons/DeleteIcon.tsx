import type { SVGProps } from 'react';

const SvgDeleteIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="delete-icon_svg__a"
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
    <g mask="url(#delete-icon_svg__a)">
      <path
        fill="#fff"
        d="M7.308 20.5q-.749 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V6h-1V4.5H9v-.885h6V4.5h4.5V6h-1v12.692q0 .758-.525 1.283t-1.283.525zM17 6H7v12.692a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087h9.385a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212zM9.404 17h1.5V8h-1.5zm3.692 0h1.5V8h-1.5z"
      />
    </g>
  </svg>
);
export default SvgDeleteIcon;
