import {
  COLOR,
  Container,
  Dropdown,
  InfoTooltip,
  Loading,
  ThemeContext,
} from '@digital-twin/components';
import { ParetoChart, SPCChart, TableChart } from '@digital-twin/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getQuality,
  getQualityKeys,
  PRODUCTION_POLL,
  PRODUCTION_QUERY,
  ProductionQuality,
  ProductionTool,
  QualityKey,
} from '../api/production.api';
import { chartAxis, chartTooltip } from '../production.charts';
import styles from '../production.module.scss';
import {
  fmtDec,
  fmtInt,
  fmtPct,
  fmtTime,
  QUALITY_WINDOWS,
  qualityFilters,
  toolTag,
  withFilters,
} from '../production.utils';
import { Empty, Pill, Tile } from './shared';

const DISPOSITION: Record<string, string> = {
  thickness: 'Film thickness on 3 wafers per lot (some films on half of the lots).',
  cd: 'Critical dimension on 3 wafers per lot: resist CD on the CD-SEM after develop (out of spec: strip and expose again, twice at most), etched CD by OCD (etched patterns cannot be reworked: out-of-spec wafers are scrapped).',
  overlay:
    'Layer-to-layer overlay on 3 wafers per lot after develop. Out of spec: strip the resist, clean and expose again (twice at most).',
  rs: 'Sheet resistance on 3 wafers per lot by four-point probe. Out of spec: scrap.',
  defects:
    'Particle and pattern defect adders since the previous inspection on 1 - 2 wafers (30 - 100 % of the lots by layer). Over 30: hold the tool that added most, scrub and inspect again once, then scrap the two worst wafers.',
  wat: 'Wafer acceptance test of every wafer of every finished lot: share of the scribe-line parametric test sites in specification (Vt, Idsat, leakage, contact / via chains, sheet resistances). Below 92 %: the wafer is scrapped.',
};

const SpcChart = ({ q }: { q: ProductionQuality }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const ok = q.points.filter((p) => p.pass);
    const bad = q.points.filter((p) => !p.pass);
    const point = (p: ProductionQuality['points'][number]) => ({
      value: [Date.parse(p.ts), p.value],
      meta: p,
    });
    const limits: { name: string; yAxis: number; color: string; dash: boolean }[] = [];
    if (q.usl !== null)
      limits.push({
        name: `USL ${fmtDec(q.usl, 1)}`,
        yAxis: q.usl,
        color: colors.conditionCriticalPrimary,
        dash: false,
      });
    if (q.lsl !== null)
      limits.push({
        name: `LSL ${fmtDec(q.lsl, 1)}`,
        yAxis: q.lsl,
        color: colors.conditionCriticalPrimary,
        dash: false,
      });
    if (q.spc) {
      limits.push({
        name: `UCL ${fmtDec(q.spc.ucl, 2)}`,
        yAxis: q.spc.ucl,
        color: colors.conditionWarningPrimary,
        dash: true,
      });
      if (q.param !== 'defects' || q.spc.lcl > 0)
        limits.push({
          name: `LCL ${fmtDec(q.spc.lcl, 2)}`,
          yAxis: q.spc.lcl,
          color: colors.conditionWarningPrimary,
          dash: true,
        });
      limits.push({
        name: `CL ${fmtDec(q.spc.cl, 2)}`,
        yAxis: q.spc.cl,
        color: colors.statusRunningPrimary,
        dash: true,
      });
    }
    const values = q.points.map((p) => p.value);
    const lo = Math.min(
      ...values,
      ...(q.lsl !== null ? [q.lsl] : []),
      ...(q.spc ? [q.spc.lcl] : [])
    );
    const hi = Math.max(
      ...values,
      ...(q.usl !== null ? [q.usl] : []),
      ...(q.spc ? [q.spc.ucl] : [])
    );
    const pad = (hi - lo) * 0.08 || 1;
    return {
      animation: false,
      grid: { left: 8, right: 96, top: 16, bottom: 30, containLabel: true },
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      tooltip: {
        ...chartTooltip(colors),
        formatter: (p: unknown) => {
          const m = (p as { data?: { meta?: ProductionQuality['points'][number] } }).data?.meta;
          if (!m) return '';
          return [
            `<b>${m.lotCode}</b> · wafer ${m.wafer}`,
            `${fmtDec(m.value, q.param === 'defects' ? 0 : 2)} ${q.unit ?? ''} · ${m.pass ? 'in spec' : 'out of spec'}`,
            `${m.sourceAlias ? toolTag(m.sourceAlias) : '--'}${m.sourceChamber ? ` ${m.sourceChamber}` : ''}`,
            fmtTime(m.ts),
          ].join('<br/>');
        },
      },
      xAxis: { type: 'time', ...axis, splitLine: { show: false } },
      yAxis: {
        type: 'value',
        name: q.unit ?? '',
        min: Math.floor(Math.max(q.param === 'defects' ? 0 : -Infinity, lo - pad) * 10) / 10,
        max: Math.ceil((hi + pad) * 10) / 10,
        nameTextStyle: { color: colors.neutralTextCaption },
        ...axis,
      },
      series: [
        {
          name: 'In spec',
          type: 'scatter',
          symbolSize: 4,
          large: ok.length > 2000,
          itemStyle: { color: colors.brandSurfaceDefaultPrimary, opacity: 0.6 },
          data: ok.map(point),
          markLine: {
            silent: true,
            symbol: 'none',
            label: { position: 'end', fontSize: 11, formatter: '{b}' },
            data: limits.map((l) => ({
              name: l.name,
              yAxis: l.yAxis,
              lineStyle: { color: l.color, type: l.dash ? 'dashed' : 'solid', width: 1.2 },
              label: { color: l.color },
            })),
          },
        },
        {
          name: 'Out of spec',
          type: 'scatter',
          symbolSize: 7,
          itemStyle: { color: colors.conditionCriticalPrimary },
          data: bad.map(point),
        },
      ],
    };
  }, [q, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 340, width: '100%' }} />
  );
};

const ScrapPareto = ({ pareto }: { pareto: ProductionQuality['scrapPareto'] }) => {
  const { colors } = useContext(ThemeContext);
  const option = useMemo<EChartsOption>(() => {
    const axis = chartAxis(colors);
    const total = pareto.reduce((s, p) => s + p.wafers, 0);
    let run = 0;
    const cum = pareto.map((p) => {
      run += p.wafers;
      return total ? (100 * run) / total : 0;
    });
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: { ...chartTooltip(colors), trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: pareto.map((p) => p.reason.replace(/_/g, ' ').toLowerCase()),
        axisLabel: { ...axis.axisLabel, interval: 0 },
        axisLine: axis.axisLine,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'wafers',
          minInterval: 1,
          nameTextStyle: { color: colors.neutralTextCaption },
          ...axis,
        },
        {
          type: 'value',
          max: 100,
          axisLabel: { ...axis.axisLabel, formatter: '{value} %' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Wafers',
          type: 'bar',
          barMaxWidth: 36,
          itemStyle: { color: colors.conditionCriticalPrimary, borderRadius: [3, 3, 0, 0] },
          data: pareto.map((p) => p.wafers),
        },
        {
          name: 'Cumulative',
          type: 'line',
          yAxisIndex: 1,
          symbolSize: 5,
          lineStyle: { color: colors.neutralTextCaption },
          itemStyle: { color: colors.neutralTextCaption },
          data: cum,
          tooltip: {
            valueFormatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(0)} %` : '--'),
          },
        },
      ],
    };
  }, [pareto, colors]);
  return (
    <ReactECharts option={option} notMerge lazyUpdate style={{ height: 260, width: '100%' }} />
  );
};

const keyLabel = (k: QualityKey) =>
  `${k.charKey === 'DEFECTS' ? 'Defects' : k.charKey} · ${k.name ?? k.param}${k.fails ? ` (${k.fails} out of spec)` : ''}`;

const cpkColor = (cpk: number | null, n: number) =>
  cpk === null || n < 20 ? 'secondary' : cpk >= 1.33 ? 'normal' : cpk >= 1 ? 'warning' : 'critical';

/**
 * Quality per characteristic (every film, CD, overlay, sheet resistance, the defect adders and the
 * WAT): spec and control limits, Cpk by source tool and chamber, scrap Pareto, yields, and the
 * capability summary of every characteristic.
 */
export const QualityTab = ({ tools }: { tools: ProductionTool[] }) => {
  const [url, setUrl] = useSearchParams();
  const [charKey, setCharKey] = useState(() => qualityFilters(url).charKey);
  const [hours, setHours] = useState(() => qualityFilters(url).hours);
  const [toolId, setToolId] = useState(() => qualityFilters(url).toolId);
  // the tab's filters live in the URL (assistant links, reload); defaults are left out
  // biome-ignore lint/correctness/useExhaustiveDependencies: written on the filters' change only
  useEffect(() => {
    const next = withFilters(url, [
      ['char', charKey, ''],
      ['quality-window', hours, '168'],
      ['quality-tool', toolId, ''],
    ]);
    if (next) setUrl(next, { replace: true });
  }, [charKey, hours, toolId]);
  const keys = useQuery({
    queryKey: PRODUCTION_QUERY.qualityKeys(Number(hours)),
    queryFn: () => getQualityKeys(Number(hours)),
    refetchInterval: PRODUCTION_POLL.quality,
    placeholderData: keepPreviousData,
    meta: { toastId: 'productionQualityKeys' },
  });
  // a char key the window doesn't have (an old link) falls back like none
  const key =
    (charKey && keys.data?.some((k) => k.charKey === charKey) ? charKey : '') ||
    keys.data?.find((k) => k.fails > 0)?.charKey ||
    keys.data?.[0]?.charKey ||
    '';
  const meta = keys.data?.find((k) => k.charKey === key);
  const params = {
    charKey: key,
    hours: Number(hours),
    equipmentId: toolId ? Number(toolId) : undefined,
  };
  const q = useQuery({
    queryKey: PRODUCTION_QUERY.quality(params),
    queryFn: () => getQuality(params),
    refetchInterval: PRODUCTION_POLL.quality,
    placeholderData: keepPreviousData,
    enabled: !!key,
    meta: { toastId: 'productionQuality' },
  });
  const d = q.data?.charKey === key ? q.data : undefined;
  const sources = new Set((d?.byChamber ?? []).map((c) => c.sourceAlias));
  const sourceTools = tools.filter((t) => sources.has(t.alias) || String(t.id) === toolId);
  const fails = d ? d.points.filter((p) => !p.pass).length : 0;
  const worstCpk = d?.byChamber.reduce<number | null>(
    (m, c) => (c.cpk !== null && c.n >= 20 && (m === null || c.cpk < m) ? c.cpk : m),
    null
  );
  const title = d
    ? `${d.charKey === 'DEFECTS' ? 'Defect adders' : `${d.charKey} · ${d.name ?? ''}`}`
    : 'Characteristic';
  const info = [
    meta?.steps ? `Measured at ${meta.steps}.` : '',
    d?.param ? (DISPOSITION[d.param] ?? '') : '',
    d && (d.lsl !== null || d.usl !== null)
      ? `Specification ${d.lsl !== null ? fmtDec(d.lsl, 2) : ''}${d.lsl !== null && d.usl !== null ? ' – ' : d.usl !== null ? '≤ ' : '≥ '}${d.usl !== null ? fmtDec(d.usl, 2) : ''} ${d.unit ?? ''}${d.target !== null ? `, target ${fmtDec(d.target, 2)}` : ''}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const worst = [...(keys.data ?? [])]
    .filter((k) => k.cpk !== null && k.n >= 20)
    .sort((a, b) => (a.cpk ?? 0) - (b.cpk ?? 0))
    .slice(0, 12);
  return (
    <div className={styles.scroll}>
      <div className={styles.filters}>
        <Dropdown
          label="Characteristic"
          labelPosition="left"
          variant="medium"
          background="dark"
          value={key}
          options={(keys.data ?? []).map((k) => ({ value: k.charKey, label: keyLabel(k) }))}
          onChange={(v) => {
            setCharKey(v);
            setToolId('');
          }}
          wrapperClassName={styles.filterWide}
        />
        <Dropdown
          label="Source tool"
          labelPosition="left"
          variant="medium"
          background="dark"
          value={toolId}
          options={[
            { value: '', label: 'All tools' },
            ...sourceTools.map((t) => ({ value: String(t.id), label: toolTag(t.alias) })),
          ]}
          onChange={setToolId}
          wrapperClassName={styles.filter}
        />
        <Dropdown
          label="Window"
          labelPosition="left"
          variant="medium"
          background="dark"
          value={hours}
          options={QUALITY_WINDOWS}
          onChange={(v) => {
            setHours(v);
            setToolId('');
          }}
          wrapperClassName={styles.filter}
        />
      </div>
      <div className={styles.cards}>
        <Tile
          title="Measurements"
          value={d ? fmtInt(d.spc?.n ?? d.points.length) : '…'}
          accent={COLOR.accentInfoPrimary}
          info={info || undefined}
        />
        <Tile
          title="Out of spec"
          value={d ? fmtInt(fails) : '…'}
          accent={fails ? COLOR.conditionCriticalPrimary : COLOR.conditionNormalPrimary}
          sub="measured wafers (shown points)"
        />
        <Tile
          title="First-pass yield"
          value={d ? fmtPct(d.firstPassYield, 2) : '…'}
          accent={COLOR.statusRunningPrimary}
          info="Measurement steps (first pass, not rework) whose lot passed, over all of them."
        />
        <Tile
          title="Worst Cpk"
          value={worstCpk !== null && worstCpk !== undefined ? fmtDec(worstCpk, 2) : '--'}
          accent={
            worstCpk === null || worstCpk === undefined
              ? COLOR.borderLight
              : worstCpk >= 1.33
                ? COLOR.conditionNormalPrimary
                : worstCpk >= 1
                  ? COLOR.conditionWarningPrimary
                  : COLOR.conditionCriticalPrimary
          }
          info="Lowest process capability of a tool chamber with at least 20 measurements (1.33 capable, below 1.0 not capable)."
        />
        <Tile
          title="Rework"
          value={d ? fmtInt(d.reworkWafers) : '…'}
          unit="wafers"
          accent={COLOR.conditionWarningPrimary}
        />
      </div>
      <Container
        data-nav-section="characteristic"
        title={title}
        icon={<SPCChart />}
        titleSuffixIcon={info ? <InfoTooltip title={title} content={info} /> : undefined}
        background="none"
        className={styles.panel}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 8, position: 'relative' } }}
      >
        <Loading isLoading={q.isFetching && !d} />
        {d && d.points.length ? (
          <SpcChart q={d} />
        ) : (
          <Empty>{q.isLoading ? 'Loading…' : 'No measurements in this window'}</Empty>
        )}
      </Container>
      <div className={styles.grid2}>
        <Container
          data-nav-section="capability"
          title="Capability by chamber"
          icon={<TableChart />}
          background="none"
          className={styles.panel}
        >
          {d && d.byChamber.length ? (
            <table className={styles.toolTable}>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Chamber</th>
                  <th className={styles.toolTable__num}>n</th>
                  <th className={styles.toolTable__num}>Mean</th>
                  <th className={styles.toolTable__num}>σ</th>
                  <th className={styles.toolTable__num}>Cpk</th>
                  <th className={styles.toolTable__num}>Fails</th>
                </tr>
              </thead>
              <tbody>
                {d.byChamber.map((c, i) => (
                  <tr key={i}>
                    <td>{c.sourceAlias ? toolTag(c.sourceAlias) : '--'}</td>
                    <td>{c.chamber ?? '--'}</td>
                    <td className={styles.toolTable__num}>{fmtInt(c.n)}</td>
                    <td className={styles.toolTable__num}>
                      {fmtDec(c.mean, d.param === 'rs' ? 3 : 2)}
                    </td>
                    <td className={styles.toolTable__num}>
                      {fmtDec(c.sd, d.param === 'rs' ? 4 : 2)}
                    </td>
                    <td className={styles.toolTable__num}>
                      {c.cpk === null ? (
                        '--'
                      ) : (
                        <Pill
                          color={
                            c.n < 20
                              ? 'secondary'
                              : c.cpk >= 1.33
                                ? 'normal'
                                : c.cpk >= 1
                                  ? 'warning'
                                  : 'critical'
                          }
                          title={c.n < 20 ? 'Fewer than 20 measurements' : undefined}
                        >
                          {fmtDec(c.cpk, 2)}
                        </Pill>
                      )}
                    </td>
                    <td className={styles.toolTable__num}>{fmtInt(c.fails)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No measurements</Empty>
          )}
        </Container>
        <Container
          data-nav-section="scrap"
          title="Scrap by reason"
          icon={<ParetoChart />}
          background="none"
          className={styles.panel}
        >
          {d && d.scrapPareto.length ? (
            <ScrapPareto pareto={d.scrapPareto} />
          ) : (
            <Empty>No scrap in this window</Empty>
          )}
        </Container>
      </div>
      <Container
        data-nav-section="capability-summary"
        title="Capability summary (lowest Cpk first)"
        icon={<TableChart />}
        background="none"
        className={styles.panel}
      >
        {worst.length ? (
          <table className={styles.toolTable}>
            <thead>
              <tr>
                <th>Characteristic</th>
                <th>Measured at</th>
                <th className={styles.toolTable__num}>n</th>
                <th className={styles.toolTable__num}>Mean</th>
                <th className={styles.toolTable__num}>Spec</th>
                <th className={styles.toolTable__num}>Cpk</th>
                <th className={styles.toolTable__num}>Fails</th>
              </tr>
            </thead>
            <tbody>
              {worst.map((k) => (
                <tr
                  key={k.charKey}
                  onClick={() => {
                    setCharKey(k.charKey);
                    setToolId('');
                  }}
                  className={k.charKey === key ? styles.toolTable__selected : undefined}
                  style={{ cursor: 'pointer' }}
                >
                  <td title={k.name ?? undefined}>
                    <b>{k.charKey === 'DEFECTS' ? 'Defects' : k.charKey}</b>{' '}
                    <span className={styles.muted}>{k.name}</span>
                  </td>
                  <td className={styles.muted}>{k.steps ?? '--'}</td>
                  <td className={styles.toolTable__num}>{fmtInt(k.n)}</td>
                  <td className={styles.toolTable__num}>
                    {fmtDec(k.mean, k.param === 'rs' ? 3 : 2)} {k.unit}
                  </td>
                  <td className={styles.toolTable__num}>
                    {k.lsl !== null ? fmtDec(k.lsl, 2) : ''}
                    {k.lsl !== null && k.usl !== null ? ' – ' : k.usl !== null ? '≤ ' : '≥ '}
                    {k.usl !== null ? fmtDec(k.usl, 2) : ''}
                  </td>
                  <td className={styles.toolTable__num}>
                    <Pill color={cpkColor(k.cpk, k.n)}>{fmtDec(k.cpk, 2)}</Pill>
                  </td>
                  <td className={styles.toolTable__num}>{fmtInt(k.fails)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>{keys.isLoading ? 'Loading…' : 'No measurements in this window'}</Empty>
        )}
      </Container>
    </div>
  );
};
