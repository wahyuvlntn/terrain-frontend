export type ScreenRow = [label: string, value: string];

type ScreenDefinition = {
  slot: string;
  w: number;
  h: number;
  title: string;
  rows: ScreenRow[];
};

/** GLB mesh names for FAB1 controllers, mapped to the slots updated by the live-data hook. */
export const fab1ScreenDefinitions = (name: string): Record<string, ScreenDefinition> => ({
  MAU_HMI_Screen: {
    slot: 'HMI_Screen',
    w: 640,
    h: 400,
    title: `${name} · Air controller`,
    rows: [
      ['Supply air', '-- °C'],
      ['Supply RH', '-- %'],
      ['Pre-filter dP', '-- Pa'],
      ['Airflow', '-- m³/h'],
    ],
  },
  MAU_VFD_Display: {
    slot: 'VFD_Display',
    w: 256,
    h: 136,
    title: 'Supply fan',
    rows: [['Fan', '-- %']],
  },
  DP_HMI_Screen: {
    slot: 'HMI_Screen',
    w: 640,
    h: 400,
    title: `${name} · Vacuum controller`,
    rows: [
      ['Inlet pressure', '-- mbar'],
      ['Pump body', '-- °C'],
      ['N2 purge', '-- slm'],
      ['Cooling water', '-- l/min'],
    ],
  },
  DP_VFD_Display: {
    slot: 'VFD_Display',
    w: 256,
    h: 136,
    title: 'Pump drive',
    rows: [['Motor', '-- A']],
  },
  // process tools, scrubbers and process chillers: one controller face (rows set per model)
  TOOL_HMI_Screen: {
    slot: 'HMI_Screen',
    w: 640,
    h: 400,
    title: `${name} · Controller`,
    rows: [
      ['Status', '--'],
      ['Throughput', '-- wph'],
      ['Wafers today', '--'],
      ['Lots waiting', '--'],
    ],
  },
});

const STATUS_FALLBACK = '#f0a20b';

/** Canvas can't resolve CSS variables: read `var(--x)` from the document (follows the theme). */
const canvasColor = (color: string | undefined) => {
  const variable = color && /^var\((--[^,)]+)/.exec(color);
  if (!variable) return color || STATUS_FALLBACK;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(variable[1]).trim() ||
    STATUS_FALLBACK
  );
};

/**
 * Draws a simple controller-style screen onto a canvas used as the texture of the
 * HMI / VFD display faces in the GLB. A single row is drawn as a compact big-number display.
 */
export const drawScreen = (
  canvas: HTMLCanvasElement,
  title: string,
  rows: ScreenRow[],
  status?: string,
  statusColor?: string
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const s = h / 400;
  const compact = rows.length === 1;
  const dotColor = canvasColor(statusColor);

  ctx.fillStyle = '#071a30';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0f4f8f';
  ctx.fillRect(0, 0, w, compact ? h * 0.3 : 64 * s);

  ctx.fillStyle = '#e8f1ff';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${compact ? h * 0.18 : 30 * s}px "Segoe UI", Inter, sans-serif`;
  ctx.fillText(title, compact ? w * 0.05 : 24 * s, compact ? h * 0.15 : 32 * s);

  if (compact) {
    const [label, value] = rows[0];
    ctx.font = `700 ${h * 0.38}px "Segoe UI", Inter, sans-serif`;
    ctx.fillStyle = '#7dffb0';
    ctx.textAlign = 'right';
    ctx.fillText(value, w * 0.95, h * 0.62);
    ctx.font = `500 ${h * 0.12}px "Segoe UI", Inter, sans-serif`;
    ctx.fillStyle = '#9fb6cf';
    ctx.textAlign = 'left';
    ctx.fillText(label, w * 0.05, h * 0.9);
    if (status) {
      ctx.textAlign = 'right';
      ctx.fillText(status, w * 0.95, h * 0.9);
      const textWidth = ctx.measureText(status).width;
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(w * 0.95 - textWidth - h * 0.06, h * 0.9, h * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    return;
  }

  const top = 92 * s;
  const rowH = 58 * s;
  rows.forEach(([label, value], i) => {
    const y = top + i * rowH;
    ctx.fillStyle = i % 2 ? '#0b2440' : '#0d2a4a';
    ctx.fillRect(16 * s, y - rowH / 2 + 4 * s, w - 32 * s, rowH - 8 * s);
    ctx.textAlign = 'left';
    ctx.font = `500 ${24 * s}px "Segoe UI", Inter, sans-serif`;
    ctx.fillStyle = '#9fb6cf';
    ctx.fillText(label, 32 * s, y);
    ctx.textAlign = 'right';
    ctx.font = `700 ${28 * s}px "Segoe UI", Inter, sans-serif`;
    ctx.fillStyle = '#e8f1ff';
    ctx.fillText(value, w - 32 * s, y);
  });

  if (status) {
    ctx.textAlign = 'left';
    ctx.font = `600 ${20 * s}px "Segoe UI", Inter, sans-serif`;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(32 * s, h - 32 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(status, 48 * s, h - 32 * s);
  }
  ctx.textAlign = 'left';
};
