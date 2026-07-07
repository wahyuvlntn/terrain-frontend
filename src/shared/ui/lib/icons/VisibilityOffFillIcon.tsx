import type { SVGProps } from 'react';

const SvgVisibilityOffFillIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <mask
      id="visibility_off-fill-icon_svg__a"
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
    <g mask="url(#visibility_off-fill-icon_svg__a)">
      <path
        fill="currentColor"
        d="m19.762 21.87-4.047-4.016q-.768.285-1.704.465A10.6 10.6 0 0 1 12 18.5q-3.525 0-6.34-1.938T1.538 11.5A11 11 0 0 1 2.97 9.028 11.4 11.4 0 0 1 4.9 7.038l-2.77-2.8 1.055-1.053 17.63 17.63zM12 15.576q.313 0 .642-.054.33-.053.585-.158l-5.092-5.092q-.104.275-.158.599a4 4 0 0 0-.054.628q0 1.702 1.188 2.89 1.186 1.187 2.889 1.187m6.954.507-3.137-3.111q.117-.32.189-.685.07-.365.07-.788 0-1.702-1.187-2.89Q13.702 7.424 12 7.424q-.423 0-.779.076a3.2 3.2 0 0 0-.684.228L8.035 5.235a10 10 0 0 1 1.936-.556q.989-.18 2.029-.18 3.516.001 6.34 1.94 2.825 1.938 4.122 5.06-.557 1.34-1.436 2.503a11 11 0 0 1-2.072 2.082m-4.27-4.234-3.009-3q.661-.124 1.249.098.588.223 1.013.663.434.44.636 1.033t.112 1.206"
      />
    </g>
  </svg>
);
export default SvgVisibilityOffFillIcon;
