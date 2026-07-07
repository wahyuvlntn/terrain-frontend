import type { SVGProps } from 'react';

const SvgExportNotesIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="export_notes-icon_svg__a"
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
    <g mask="url(#export_notes-icon_svg__a)">
      <path
        fill="#fff"
        d="m16.383 20.298 2.665-2.665v2.184h.885v-3.692H16.24v.885h2.185l-2.665 2.665zM5.308 20.5q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V5.308q0-.748.53-1.278t1.278-.53h13.384q.749 0 1.278.53.53.53.53 1.278v6.325a6.399 6.399 0 0 0-1.5-.442V5.307a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096h5.857a5.2 5.2 0 0 0 .433 1.5zM5 19V5v6.19-.075zm2.25-2.365h4.017q.066-.39.194-.761.13-.37.281-.74H7.25zm0-3.885h6.34q.646-.547 1.38-.918a5.8 5.8 0 0 1 1.568-.526v-.056H7.25zm0-3.885h9.5v-1.5h-9.5zM18 22.558q-1.873 0-3.187-1.314-1.313-1.313-1.313-3.186t1.313-3.187T18 13.558t3.186 1.313 1.314 3.187-1.314 3.186Q19.874 22.558 18 22.558"
      />
    </g>
  </svg>
);
export default SvgExportNotesIcon;
