import type { SVGProps } from 'react';

const SvgLockFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="lock-fill-icon_svg__a"
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
    <g mask="url(#lock-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="M6.308 21.5a1.74 1.74 0 0 1-1.277-.531 1.74 1.74 0 0 1-.531-1.277v-9.384q0-.746.531-1.277A1.74 1.74 0 0 1 6.308 8.5H7.5v-2q0-1.873 1.313-3.187Q10.127 2 12 2t3.187 1.313T16.5 6.5v2h1.192q.746 0 1.277.531t.531 1.277v9.384q0 .746-.531 1.277a1.74 1.74 0 0 1-1.277.53zM12 16.75q.729 0 1.24-.51.51-.511.51-1.24 0-.73-.51-1.24-.511-.51-1.24-.51-.73 0-1.24.51T10.25 15q0 .729.51 1.24.51.51 1.24.51M9 8.5h6v-2q0-1.25-.875-2.125A2.9 2.9 0 0 0 12 3.5q-1.25 0-2.125.875A2.9 2.9 0 0 0 9 6.5z"
      />
    </g>
  </svg>
);
export default SvgLockFillIcon;
