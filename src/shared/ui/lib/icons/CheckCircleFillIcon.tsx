import type { SVGProps } from 'react';

const SvgCheckCircleFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="check_circle-fill-icon_svg__a"
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
    <g mask="url(#check_circle-fill-icon_svg__a)">
      <path
        fill="#fff"
        d="m10.58 16.254 6.724-6.723-1.054-1.054-5.67 5.67-2.85-2.85-1.053 1.053zm1.422 5.246a9.3 9.3 0 0 1-3.705-.748 9.6 9.6 0 0 1-3.018-2.03 9.6 9.6 0 0 1-2.03-3.016 9.2 9.2 0 0 1-.749-3.704q0-1.972.748-3.705a9.6 9.6 0 0 1 2.03-3.018 9.6 9.6 0 0 1 3.016-2.03 9.2 9.2 0 0 1 3.704-.749q1.972 0 3.705.748a9.6 9.6 0 0 1 3.018 2.03 9.6 9.6 0 0 1 2.03 3.016 9.2 9.2 0 0 1 .749 3.704q0 1.972-.748 3.705a9.6 9.6 0 0 1-2.03 3.018 9.6 9.6 0 0 1-3.016 2.03 9.2 9.2 0 0 1-3.704.749"
      />
    </g>
  </svg>
);
export default SvgCheckCircleFillIcon;
