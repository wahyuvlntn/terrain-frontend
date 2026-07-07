import type { SVGProps } from 'react';

const SvgPersonAddIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="person_add-icon_svg__a"
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
    <g mask="url(#person_add-icon_svg__a)">
      <path
        fill="#fff"
        d="M18.125 13.75v-3h-3v-1.5h3v-3h1.5v3h3v1.5h-3v3zM9 11.692q-1.444 0-2.472-1.028T5.5 8.192t1.028-2.471T9 4.692t2.472 1.029T12.5 8.192t-1.028 2.472Q10.443 11.692 9 11.692m-7.5 7.616v-2.223q0-.735.399-1.36a2.66 2.66 0 0 1 1.066-.963 14.5 14.5 0 0 1 2.992-1.09 12.95 12.95 0 0 1 6.086 0q1.509.363 2.992 1.09.667.336 1.066.962t.399 1.36v2.224zm1.5-1.5h12v-.723a1 1 0 0 0-.176-.563 1.33 1.33 0 0 0-.478-.422 13 13 0 0 0-2.635-.964 11.4 11.4 0 0 0-5.422 0q-1.343.327-2.635.964-.301.164-.478.422a1 1 0 0 0-.176.563zm6-7.616q.824 0 1.412-.587Q11 9.017 11 8.192q0-.824-.588-1.412A1.93 1.93 0 0 0 9 6.192q-.824 0-1.413.588A1.93 1.93 0 0 0 7 8.192q0 .825.587 1.413.588.588 1.413.587"
      />
    </g>
  </svg>
);
export default SvgPersonAddIcon;
