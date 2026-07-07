import type { SVGProps } from 'react';

const SvgSettingsFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="settings-fill-icon_svg__a"
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
    <g mask="url(#settings-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="m9.692 21.5-.38-3.046a5.334 5.334 0 0 1-1.579-.896L4.912 18.75l-2.308-4 2.44-1.844a5 5 0 0 1-.049-.448 7 7 0 0 1 0-.882q.014-.22.05-.482L2.603 9.25l2.308-3.98 2.811 1.182a6.4 6.4 0 0 1 .772-.524 5 5 0 0 1 .807-.382l.39-3.046h4.616l.38 3.056q.45.163.815.381t.735.515l2.85-1.183 2.308 3.981-2.479 1.873q.054.243.059.453t.005.424q0 .204-.01.415-.01.21-.069.481l2.46 1.854-2.308 4-2.815-1.202q-.372.296-.758.524a4.6 4.6 0 0 1-.793.372l-.38 3.056zm2.32-6.5q1.248 0 2.124-.876A2.9 2.9 0 0 0 15.012 12q0-1.248-.876-2.124A2.9 2.9 0 0 0 12.012 9q-1.264 0-2.132.876A2.9 2.9 0 0 0 9.01 12q0 1.248.869 2.124T12.01 15"
      />
    </g>
  </svg>
);
export default SvgSettingsFillIcon;
