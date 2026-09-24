import { jsRequest } from '@digital-twin/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  camelize,
  getLots,
  getOverview,
  getQuality,
  getQualityKeys,
  getTimeline,
  getTools,
  getTrend,
} from './production.api';

vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const request = vi.mocked(jsRequest);

beforeEach(() => {
  request.mockReset();
});

/** Responses as the backend writes them (docs/production/DESIGN.md §6) */
const OVERVIEW = {
  window: { from: '2026-10-12T00:00:00.000Z', to: '2026-10-13T00:00:00.000Z', hours: 24 },
  kpi: {
    oee: 63.6,
    availability: 93.9,
    operational: 72.1,
    rate: 94,
    quality: 99.8,
    uptime: 93.9,
    utilization: 67.8,
    wafer_starts: 1450,
    lot_starts: 58,
    wafer_outs: 1400,
    lot_outs: 56,
    moves: 970,
    wafer_moves: 24000,
    wip_lots: 43,
    wip_wafers: 1074,
    cycle_time_h: 417.6,
    cycle_time_days: 17.4,
    x_factor: 2.7,
    on_time: 94,
    line_yield: 99.81,
    scrap_wafers: 3,
    rework_wafers: 25,
    hold_lots: 0,
    tools: 28,
    transfers: 2210,
    transport_min: 0.93,
    oht_util: 12.4,
    vehicles: 10,
  },
  losses: {
    total_h: 240,
    non_scheduled_h: 0,
    scheduled_down_h: 4,
    unscheduled_down_h: 10,
    standby_h: 62,
    rate_loss_h: 9.7,
    quality_loss_h: 0.2,
    good_h: 154.1,
  },
  by_type: [
    {
      tool_type: 'ETCH',
      oee: 75.5,
      availability: 96,
      operational: 80.7,
      rate: 97.7,
      quality: 99.7,
      utilization: 77.5,
      tools: 3,
      wafers: 3800,
      moves: 152,
    },
  ],
  wip_by_area: [
    { area: 'LITHO', name: 'Lithography', queued: 9, processing: 3, hold: 1, wafers: 325 },
  ],
  wip_by_layer: [{ layer: 'STI', module: 'FEOL', queued: 2, processing: 1, hold: 0 }],
  products: [
    {
      product_code: 'MCU40',
      name: '40 nm low-power microcontroller',
      masks: 33,
      planned_cycle_days: 20,
      lot_outs: 80,
      wafer_outs: 1990,
      wip_lots: 42,
      cycle_time_days: 16.9,
      days_per_mask: 0.51,
      x_factor: 2.61,
      on_time: 95,
      line_yield: 99.4,
    },
  ],
};

describe('production api', () => {
  it('camelizes nested keys', () => {
    expect(camelize({ a_b: [{ c_d_e: 1 }], x: null })).toEqual({ aB: [{ cDE: 1 }], x: null });
  });

  it('reads the overview', async () => {
    request.mockResolvedValueOnce(OVERVIEW);
    const o = await getOverview(24);
    expect(request).toHaveBeenCalledWith({ url: '/production/getoverview', data: { hours: 24 } });
    expect(o.kpi).toMatchObject({
      oee: 63.6,
      waferOuts: 1400,
      xFactor: 2.7,
      lineYield: 99.81,
      cycleTimeDays: 17.4,
      transfers: 2210,
      transportMin: 0.93,
      ohtUtil: 12.4,
      vehicles: 10,
    });
    expect(o.losses.goodH).toBe(154.1);
    expect(o.byType[0].toolType).toBe('ETCH');
    expect(o.wipByArea[0]).toMatchObject({ area: 'LITHO', queued: 9 });
    expect(o.wipByLayer[0]).toMatchObject({ layer: 'STI', module: 'FEOL' });
    expect(o.products[0]).toMatchObject({ productCode: 'MCU40', daysPerMask: 0.51 });
  });

  it('keeps undefined factors as null (no runs in the window)', async () => {
    request.mockResolvedValueOnce({
      ...OVERVIEW,
      kpi: {
        ...OVERVIEW.kpi,
        rate: null,
        quality: null,
        cycle_time_h: null,
        cycle_time_days: null,
      },
    });
    const o = await getOverview(12);
    expect(o.kpi.rate).toBeNull();
    expect(o.kpi.cycleTimeH).toBeNull();
  });

  it('reads the tools', async () => {
    request.mockResolvedValueOnce([
      {
        id: 41,
        alias: 'ETCH_01',
        name: 'Conductor Etch ETCH-01',
        model: 'ICP Etch Cluster ET-300',
        tool_type: 'ETCH',
        area_name: 'Etch',
        status: 'RUNNING',
        status_start_time: '2026-10-13T00:40:20.734Z',
        condition: 'WARNING',
        current_lot: 'MCU40-261012-004',
        current_step: 'POLY-ET',
        lot_progress: 77,
        chambers_up: 3,
        chambers_total: 3,
        queue_lots: 3,
        oee: 84.1,
        availability: 98.8,
        operational: 85.2,
        rate: 99.8,
        quality: 100,
        uptime: 98.8,
        utilization: 84.2,
        wafers: 1300,
        moves: 52,
        throughput_wph: 75,
        avg_wph: 70.4,
        scrapped: 0,
        reworked: 0,
        alarms: 2,
        location_id: 16,
      },
    ]);
    const [t] = await getTools(24);
    expect(t).toMatchObject({
      alias: 'ETCH_01',
      toolType: 'ETCH',
      currentLot: 'MCU40-261012-004',
      chambersUp: 3,
      throughputWph: 75,
    });
  });

  it('asks the trend in the client time zone', async () => {
    request.mockResolvedValueOnce({ bucket: 'shift', points: [] });
    await getTrend({ days: 7, bucket: 'shift', toolType: 'ETCH' });
    expect(request.mock.calls[0][0]).toMatchObject({
      url: '/production/gettrend',
      data: {
        days: 7,
        bucket: 'shift',
        tool_type: 'ETCH',
        timezone_offset: new Date().getTimezoneOffset(),
      },
    });
  });

  it('sends the timeline tools as CSV and reads open runs', async () => {
    request.mockResolvedValueOnce({
      from: '2026-10-12T00:00:00.000Z',
      to: '2026-10-13T00:00:00.000Z',
      tools: [
        {
          id: 1,
          alias: 'WET_01',
          name: 'Wet Clean Station WET-01',
          tool_type: 'WET',
          intervals: [
            {
              status: 'RUNNING',
              start: '2026-10-12T00:00:00.000Z',
              end: '2026-10-12T01:00:00.000Z',
            },
          ],
          runs: [
            {
              lot_code: 'A + B',
              step_code: 'WS-CLN',
              start: '2026-10-12T00:10:00.000Z',
              end: null,
              wafers: 50,
              outcome: null,
            },
          ],
        },
      ],
    });
    const tl = await getTimeline(24, [1, 2]);
    expect(request.mock.calls[0][0]).toMatchObject({ data: { hours: 24, equipment_ids: '1,2' } });
    expect(tl.tools[0].runs[0]).toMatchObject({ lotCode: 'A + B', end: null, wafers: 50 });
  });

  it('pages lots', async () => {
    request.mockResolvedValueOnce({
      count: 1,
      data: [
        {
          lot_code: 'WSOC40-261012-002',
          product_code: 'WSOC40',
          priority: 1,
          wafers_start: 25,
          wafers: 24,
          status: 'HOLD',
          step_code: 'SPC-THK',
          step_name: 'Spacer nitride thickness',
          equipment_alias: null,
          layer: 'SPACER',
          area: 'MET',
          seq: 96,
          steps: 294,
          progress_pct: 32.3,
          released_at: '2026-10-12T08:42:53.766Z',
          completed_at: null,
          due_at: '2026-10-13T13:12:53.766Z',
          cycle_time_h: 100.8,
          cycle_time_days: 4.2,
          hold_reason:
            'Film rework: Spacer nitride thickness out of spec - strip and deposit again',
          rework_count: 1,
          late: false,
        },
      ],
    });
    const page = await getLots({ status: 'hold', search: '', area: 'MET', page: 2, limit: 25 });
    expect(request.mock.calls[0][0]).toMatchObject({
      data: { status: 'hold', search: undefined, area: 'MET', page: 2, limit: 25 },
    });
    expect(page.data[0]).toMatchObject({
      status: 'HOLD',
      holdReason: expect.stringContaining('thickness'),
      reworkCount: 1,
      layer: 'SPACER',
      steps: 294,
    });
  });

  it('reads quality with optional limits', async () => {
    request.mockResolvedValueOnce({
      char_key: 'DEFECTS',
      name: 'Defect adders',
      param: 'defects',
      unit: 'adders',
      target: 0,
      lsl: null,
      usl: 30,
      points: [
        {
          ts: '2026-10-12T00:00:00.000Z',
          lot_code: 'X',
          wafer: 13,
          value: 12,
          source_alias: 'WET_01',
          source_chamber: null,
          pass: true,
          metrology_alias: 'DEF_01',
        },
      ],
      spc: { cl: 10.1, ucl: 19.6, lcl: 0.6, sigma: 3.18, n: 331, cpk: 2.1 },
      by_chamber: [
        {
          source_alias: 'WET_01',
          chamber: null,
          n: 140,
          mean: 7.97,
          sd: 3.76,
          cpk: 1.95,
          fails: 0,
        },
      ],
      scrap_pareto: [{ reason: 'BREAKAGE', wafers: 7 }],
      rework_wafers: 125,
      first_pass_yield: 98.78,
    });
    const q = await getQuality({ charKey: 'DEFECTS', hours: 168 });
    expect(request.mock.calls[0][0]).toMatchObject({ data: { char_key: 'DEFECTS', hours: 168 } });
    expect(q.lsl).toBeNull();
    expect(q.spc?.n).toBe(331);
    expect(q.byChamber[0]).toMatchObject({ sourceAlias: 'WET_01', chamber: null, cpk: 1.95 });
  });

  it('lists the measured characteristics', async () => {
    request.mockResolvedValueOnce([
      {
        char_key: 'POLY.CDE',
        param: 'cd',
        name: 'Gate CD after etch',
        unit: 'nm',
        target: 40,
        lsl: 37.5,
        usl: 42.5,
        n: 474,
        fails: 4,
        mean: 40.11,
        cpk: 1.21,
        steps: 'GATE-CD',
      },
    ]);
    const [k] = await getQualityKeys(168);
    expect(k).toMatchObject({ charKey: 'POLY.CDE', cpk: 1.21, steps: 'GATE-CD' });
  });
});
