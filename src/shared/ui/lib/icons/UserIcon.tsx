import type { SVGProps } from 'react';

const SvgUserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="user-icon_svg__a"
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
    <g mask="url(#user-icon_svg__a)">
      <path
        fill="#fff"
        d="M12 11.692q-1.444 0-2.472-1.028T8.5 8.192t1.028-2.471T12 4.692t2.472 1.029T15.5 8.192t-1.028 2.472T12 11.692m-7.5 7.616v-2.223q0-.735.399-1.36a2.66 2.66 0 0 1 1.066-.963 14.5 14.5 0 0 1 2.992-1.09 12.95 12.95 0 0 1 6.086 0q1.509.363 2.992 1.09.667.336 1.066.962t.399 1.36v2.224zm1.5-1.5h12v-.723a1 1 0 0 0-.176-.563 1.33 1.33 0 0 0-.478-.422 13 13 0 0 0-2.635-.964 11.4 11.4 0 0 0-5.422 0q-1.343.327-2.635.964-.301.164-.478.422a1 1 0 0 0-.176.563zm6-7.616q.825 0 1.412-.587Q14 9.017 14 8.192q0-.824-.588-1.412A1.93 1.93 0 0 0 12 6.192q-.825 0-1.412.588A1.93 1.93 0 0 0 10 8.192q0 .825.588 1.413.587.588 1.412.587"
      />
    </g>
  </svg>
);
export default SvgUserIcon;
