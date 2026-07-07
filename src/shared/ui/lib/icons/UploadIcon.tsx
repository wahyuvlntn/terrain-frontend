import type { SVGProps } from 'react';

const SvgUploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="upload-icon_svg__a"
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
    <g mask="url(#upload-icon_svg__a)">
      <path
        fill="#fff"
        d="M11.25 15.788v-8.4L8.785 9.854 7.73 8.769 12 4.5l4.27 4.27-1.055 1.084-2.465-2.466v8.4zM6.308 19.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283v-2.711H6v2.711q0 .116.096.212a.3.3 0 0 0 .212.096h11.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212v-2.711h1.5v2.711q0 .758-.525 1.283t-1.283.525z"
      />
    </g>
  </svg>
);
export default SvgUploadIcon;
