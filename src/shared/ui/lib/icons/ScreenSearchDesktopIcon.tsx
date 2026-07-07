import type { SVGProps } from 'react';

const SvgScreenSearchDesktopIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="screen_search_desktop-icon_svg__a"
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
    <g mask="url(#screen_search_desktop-icon_svg__a)">
      <path
        fill="#fff"
        d="m15.566 15.05.869-.839-2.273-2.273q.274-.425.402-.852a3.3 3.3 0 0 0 .128-.952q0-1.34-.94-2.266a3.1 3.1 0 0 0-2.252-.926q-1.31 0-2.25.926-.942.926-.942 2.266 0 1.341.941 2.267a3.1 3.1 0 0 0 2.251.925q.524 0 .95-.137.423-.139.873-.412zM11.5 12.134q-.825 0-1.412-.587a1.93 1.93 0 0 1-.588-1.413q0-.825.588-1.412a1.93 1.93 0 0 1 1.412-.588q.81 0 1.405.588.595.587.595 1.412t-.587 1.413a1.93 1.93 0 0 1-1.413.587M4.308 17.73q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.282V5.538q0-.758.525-1.283t1.283-.525h15.384q.758 0 1.283.525t.525 1.283v10.385q0 .757-.525 1.282-.524.525-1.283.525zm0-1.5h15.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.211V5.538a.3.3 0 0 0-.096-.211.3.3 0 0 0-.212-.097H4.308a.3.3 0 0 0-.212.097.3.3 0 0 0-.096.211v10.385q0 .115.096.211a.3.3 0 0 0 .212.096m-2.923 4v-1.5h21.23v1.5z"
      />
    </g>
  </svg>
);
export default SvgScreenSearchDesktopIcon;
