import type { SVGProps } from 'react';

const SvgUserFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="user-fill-icon_svg__a"
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
    <g mask="url(#user-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="M12 11.692q-1.444 0-2.472-1.028T8.5 8.192t1.028-2.471T12 4.692t2.472 1.029T15.5 8.192t-1.028 2.472T12 11.692m-7.5 7.616v-2.223q0-.735.399-1.36a2.66 2.66 0 0 1 1.066-.963 14.5 14.5 0 0 1 2.992-1.09 12.95 12.95 0 0 1 6.086 0q1.509.363 2.992 1.09.667.336 1.066.962t.399 1.36v2.224z"
      />
    </g>
  </svg>
);
export default SvgUserFillIcon;
