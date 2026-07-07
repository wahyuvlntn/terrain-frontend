import type { SVGProps } from 'react';

const SvgEditIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="edit-icon_svg__a"
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
    <g mask="url(#edit-icon_svg__a)">
      <path
        fill="#fff"
        d="M5 19h1.261L16.499 8.763l-1.261-1.261L5 17.739zm-1.5 1.5v-3.385L16.69 3.931a1.7 1.7 0 0 1 .501-.319 1.5 1.5 0 0 1 .575-.112q.3 0 .583.107.282.106.499.34l1.221 1.236q.233.217.332.5.099.282.099.565 0 .301-.103.576t-.328.501L6.885 20.5zM15.856 8.144l-.62-.642 1.262 1.261z"
      />
    </g>
  </svg>
);
export default SvgEditIcon;
