import type { SVGProps } from 'react';

const SvgKeyboardArrowLeftIconSidebar = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id={props.id ?? 'keyboard_arrow_left-icon_sidebar_svg__a'}
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
    <g mask="url(#keyboard_arrow_left-icon_sidebar_svg__a)">
      <path
        fill="currentColor"
        d="m10.454 12 4.6-4.6L14 6.346l-5.654 5.653L14 17.654l1.054-1.053z"
      />
    </g>
  </svg>
);
export default SvgKeyboardArrowLeftIconSidebar;
