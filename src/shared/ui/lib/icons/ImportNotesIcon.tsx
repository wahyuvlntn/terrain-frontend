import type { SVGProps } from 'react';

const SvgImportNotesIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="import_notes-icon_svg__a"
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
    <g fill="#fff" mask="url(#import_notes-icon_svg__a)">
      <path d="M5.308 20.5q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V5.308q0-.748.53-1.278t1.278-.53h13.384q.749 0 1.278.53.53.53.53 1.278v6.325a6.399 6.399 0 0 0-1.5-.442V5.307a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096h5.857a5.2 5.2 0 0 0 .433 1.5zM5 19V5v6.19-.075zm2.25-2.365h4.017q.066-.39.194-.761.13-.37.281-.74H7.25zm0-3.885h6.34q.646-.547 1.38-.918a5.8 5.8 0 0 1 1.568-.526v-.056H7.25zm0-3.885h9.5v-1.5h-9.5z" />
      <path d="m19.617 15.817-2.665 2.666v-2.185h-.885v3.692h3.693v-.884h-2.185l2.665-2.666zM18 13.557q1.873 0 3.186 1.314 1.314 1.314 1.314 3.187t-1.314 3.186Q19.874 22.558 18 22.558t-3.187-1.314-1.313-3.186q0-1.874 1.313-3.187 1.314-1.313 3.187-1.313" />
    </g>
  </svg>
);
export default SvgImportNotesIcon;
