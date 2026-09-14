import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './ai-insights.api';

// vi.mock is hoisted above the imports, so the mock function is created with it
const { jsRequest } = vi.hoisted(() => ({ jsRequest: vi.fn() }));

vi.mock('@digital-twin/utils', () => ({
  jsRequest: (req: unknown) => jsRequest(req),
  getURL: () => '',
  SESSION_ID_HEADER: 'X-AFDD-Session-Id',
}));

/** A recommendation row as the backend returns it (DESIGN.md §4.3: table row + validation_job) */
const recRow = (over: Record<string, unknown> = {}) => ({
  id: 7,
  run_id: 3,
  site_code: 'SGF1',
  status: 'VALIDATED',
  // optimizer.Conditions.as_json(): numbers plus the modes, measured values and window
  conditions: {
    wet_bulb: 26.1,
    dry_bulb: 31.4,
    load_frac: 0.74,
    cooling_load_kw: 5210,
    chillers_running: 2,
    cw_min_temp: 20,
    modes: { chws_reset_mode: 0, staging_mode: 0 },
    measured: { plant_kw: 1176.2, chws_temp: 6.58, mau_valve_max: null },
    window: { start: '2026-10-10T05:45:00Z', end: '2026-10-10T06:00:00Z' },
  },
  current: {
    setpoints: { chws_sp: 6.5, approach_sp: 3.5, riser_dp_sp: 120, chillers: 2 },
    predicted: { plant_kw: 1180.4, kw_per_rt: 0.797 },
  },
  recommended: {
    setpoints: { chws_sp: 7.0, approach_sp: 3.0, riser_dp_sp: 110, chillers: 2 },
    predicted: { plant_kw: 1120.1, kw_per_rt: 0.756 },
  },
  actions: [
    {
      asset: 'CHWS_01',
      param: 'chws_reset_mode',
      value: 1,
      unit: '',
      label: 'CHW Set Point Mode: Manual',
    },
    {
      asset: 'CHWS_01',
      param: 'chws_sp',
      value: 7.0,
      unit: '°C',
      label: 'CHW Supply Set Point: 6.5 → 7.0 °C',
    },
  ],
  savings_kw: 60.3,
  savings_pct: 5.1,
  constraints: [
    { name: 'chws_temp', op: '<=', limit: 7.5, current: 6.56, recommended: 7.1, ok: true },
  ],
  validation_job_id: 41,
  validation: { success: true, saving_pct: 4.6 },
  validation_job: { id: 41, status: 'SUCCEEDED' },
  model_id: 2,
  rationale: 'Wet bulb is low',
  created_at: '2026-10-10T06:00:00.000Z',
  valid_until: '2026-10-10T08:00:00.000Z',
  decided_by: null,
  decided_at: null,
  decision_note: null,
  apply_results: null,
  ...over,
});

beforeEach(() => jsRequest.mockReset());

describe('ai-insights api', () => {
  it('parses the overview with an embedded recommendation', async () => {
    jsRequest.mockResolvedValueOnce({
      recommendation: recRow(),
      faults: { active: 2, last24h: 5 },
      anomalies: { active: 1, last24h: 9 },
      documents: { ready: 40, pending: 1, failed: 0 },
      optimizer: {
        last_run_at: '2026-10-10T06:00:00.000Z',
        status: 'SUCCEEDED',
        next_run_at: null,
      },
      budget: { today_usd: '0.0421', limit_usd: 1.5 },
    });
    const o = await api.getAiOverview();
    expect(jsRequest).toHaveBeenCalledWith({ url: '/ai_insights/getoverview', data: {} });
    expect(o.recommendation?.savingsKw).toBe(60.3);
    expect(o.recommendation?.recommended.setpoints.chws_sp).toBe(7);
    expect(o.recommendation?.conditions).toEqual({
      values: {
        wet_bulb: 26.1,
        dry_bulb: 31.4,
        load_frac: 0.74,
        cooling_load_kw: 5210,
        chillers_running: 2,
        cw_min_temp: 20,
      },
      modes: { chws_reset_mode: 0, staging_mode: 0 },
      measured: { plant_kw: 1176.2, chws_temp: 6.58 },
    });
    expect(o.recommendation?.applyResults).toBeNull();
    expect(o.recommendation?.validationJob).toEqual({ id: 41, status: 'SUCCEEDED' });
    expect(o.optimizer).toEqual({
      lastRunAt: '2026-10-10T06:00:00.000Z',
      status: 'SUCCEEDED',
      nextRunAt: null,
    });
    expect(o.budget).toEqual({ todayUsd: 0.0421, limitUsd: 1.5 });
    expect(o.faults.last24h).toBe(5);
  });

  it('accepts a null overview recommendation', async () => {
    jsRequest.mockResolvedValueOnce({
      recommendation: null,
      faults: { active: 0, last24h: 0 },
      anomalies: { active: 0, last24h: 0 },
      documents: { ready: 0, pending: 0, failed: 0 },
      optimizer: { last_run_at: null, status: null, next_run_at: null },
      budget: { today_usd: 0, limit_usd: 1.5 },
    });
    expect((await api.getAiOverview()).recommendation).toBeNull();
  });

  it('reads JSONB columns sent as JSON text and omits empty filters', async () => {
    const row = recRow({
      status: 'VALIDATING',
      current: JSON.stringify({ setpoints: { chws_sp: 6.5 }, predicted: {} }),
      actions: JSON.stringify([{ asset: 'CHWS_01', param: 'chws_sp', value: 7 }]),
      validation: null,
      validation_job: null,
    });
    jsRequest.mockResolvedValueOnce([row]);
    const [r] = await api.getRecommendations(undefined, 10);
    expect(jsRequest).toHaveBeenCalledWith({
      url: '/ai_insights/getrecommendations',
      data: { limit: 10 },
    });
    expect(r.current.setpoints).toEqual({ chws_sp: 6.5 });
    expect(r.current.predicted).toEqual({});
    expect(r.actions[0]).toEqual({
      asset: 'CHWS_01',
      param: 'chws_sp',
      value: 7,
      unit: null,
      label: null,
    });
    expect(r.conditions.modes).toEqual({ chws_reset_mode: 0, staging_mode: 0 });
    expect(r.validationJob).toBeNull();
    expect(r.constraints).toHaveLength(1);
  });

  it('maps the apply results, including a write that could not be requested', async () => {
    const applied = {
      id: 91,
      asset_id: 31,
      parameter_id: 700,
      alias: 'chws_reset_mode',
      name: 'CHW Set Point Mode',
      unit: '',
      scale: 0,
      old_value: 0,
      value: 1,
      status: 'APPLIED',
      reason: null,
      requested_at: '2026-10-10T06:10:00.000Z',
      completed_at: '2026-10-10T06:10:00.120Z',
      username: 'jason_teo',
      user_name: 'Jason Teo',
      asset_alias: 'CHWS_01',
      label: 'CHW Set Point Mode: Manual',
    };
    // recFailure(): a control-request-shaped row without ids
    const refused = {
      ...applied,
      id: null,
      asset_id: null,
      parameter_id: null,
      alias: 'chws_sp',
      old_value: null,
      value: 7,
      status: 'REJECTED',
      reason: 'No live value from the plant',
      label: 'CHW Supply Set Point: 6.5 → 7.0 °C',
    };
    // the mode switched to Manual is written back to Reset once the set point fails
    const restore = {
      ...applied,
      id: 42,
      old_value: 1,
      value: 0,
      restore: true,
      label: 'CHW Set Point Mode: Reset',
    };
    const appliedMode = { ...applied, restored: true };
    jsRequest.mockResolvedValueOnce({
      recommendation: recRow({
        apply_results: {
          status: 'PARTIAL',
          by: 'jason_teo',
          by_name: 'Jason Teo',
          at: '2026-10-10T06:10:01.000Z',
          results: [appliedMode, refused],
          planned: 2,
          restores: [restore, { status: 'BOGUS' }],
        },
      }),
      results: [appliedMode, refused],
      restores: [restore],
    });
    const out = await api.applyRecommendation(7);
    expect(jsRequest).toHaveBeenCalledWith({
      url: '/ai_insights/applyrecommendation',
      data: { id: 7 },
    });
    expect(out.recommendation.status).toBe('VALIDATED');
    expect(out.results[0]).toMatchObject({
      alias: 'chws_reset_mode',
      assetAlias: 'CHWS_01',
      oldValue: 0,
      status: 'APPLIED',
      userName: 'Jason Teo',
    });
    expect(out.results[0].restored).toBe(true);
    expect(out.results[1]).toMatchObject({
      id: null,
      alias: 'chws_sp',
      status: 'REJECTED',
      restore: false,
      restored: null,
    });
    expect(out.restores).toEqual([
      expect.objectContaining({ id: 42, alias: 'chws_reset_mode', value: 0, restore: true }),
    ]);
    // a malformed write-back is dropped, not the record
    expect(out.recommendation.applyResults?.restores).toEqual([
      expect.objectContaining({ id: 42, status: 'APPLIED', restore: true }),
    ]);
    expect(out.recommendation.applyResults).toMatchObject({
      status: 'PARTIAL',
      byName: 'Jason Teo',
      at: '2026-10-10T06:10:01.000Z',
      planned: 2,
    });
    expect(out.recommendation.applyResults?.results.map((r) => r.status)).toEqual([
      'APPLIED',
      'REJECTED',
    ]);
  });

  it('reports an optimizer run that was already queued', async () => {
    jsRequest.mockResolvedValueOnce({ run_id: 12, status: 'RUNNING', existing: true });
    expect(await api.runOptimizer()).toEqual({ runId: 12, status: 'RUNNING', existing: true });
    jsRequest.mockResolvedValueOnce({ run_id: 13 });
    expect(await api.runOptimizer()).toEqual({ runId: 13, status: null, existing: false });
  });

  it('sends fault filters as CSV and parses instruction sources', async () => {
    jsRequest.mockResolvedValueOnce([
      {
        id: 5,
        site_code: 'SGF1',
        rule_code: 'CT-014',
        asset_id: 12,
        asset_alias: 'CT_02',
        asset_name: 'Cooling Tower CT-02',
        severity: 'WARNING',
        message: 'Approach 1.6 K above expected',
        intensity_estimate: 0.8,
        evidence: { approach_residual_k: 1.6, fan_speed_pct: [92, 95, 96] },
        started_at: '2026-10-09T01:00:00.000Z',
        last_seen_at: '2026-10-10T06:00:00.000Z',
        ended_at: null,
        status: 'ACTIVE',
        instruction_status: 'READY',
        instruction_md: 'Inspect the fill [1].',
        instruction_sources: [
          {
            n: 1,
            document_id: 3,
            title: 'BAC S3E manual',
            doc_type: 'manual',
            page: 12,
            snippet: 'Fill fouling…',
            score: 0.82,
            cited: true,
            chunk_id: 120,
          },
        ],
        instruction_model: 'gemini-2.5-flash',
        instruction_at: '2026-10-09T01:05:00.000Z',
      },
    ]);
    const [f] = await api.getFaults({
      status: 'ACTIVE',
      assetIds: [12, 13],
      ruleCodes: ['CT-014'],
      limit: 200,
    });
    expect(jsRequest).toHaveBeenCalledWith({
      url: '/ai_insights/getfaults',
      data: { status: 'ACTIVE', asset_ids: '12,13', rule_codes: 'CT-014', limit: 200 },
    });
    expect(f.instructionSources[0]).toEqual({
      n: 1,
      documentId: 3,
      title: 'BAC S3E manual',
      docType: 'manual',
      page: 12,
      heading: null,
      snippet: 'Fill fouling…',
      score: 0.82,
      cited: true,
    });
    expect(f.evidence).toEqual({ approach_residual_k: 1.6, fan_speed_pct: [92, 95, 96] });
  });

  it('parses anomalies and the detector filter', async () => {
    jsRequest.mockResolvedValueOnce([
      {
        id: 9,
        asset_id: 1,
        asset_alias: 'CH_01',
        equipment_parameter_id: 77,
        param_alias: 'chwst',
        detector: 'zscore',
        severity: 'CRITICAL',
        score: 7.2,
        value: 9.1,
        expected: 6.6,
        message: 'Robust z 7.2',
        details: {},
        started_at: '2026-10-10T05:00:00.000Z',
        last_seen_at: '2026-10-10T05:30:00.000Z',
        ended_at: null,
        status: 'ACTIVE',
      },
    ]);
    const [a] = await api.getAnomalies({ detectors: ['zscore', 'ewma'], limit: 500 });
    expect(jsRequest.mock.calls[0][0].data).toEqual({ detectors: 'zscore,ewma', limit: 500 });
    expect(a).toMatchObject({
      equipmentParameterId: 77,
      paramAlias: 'chwst',
      paramName: null,
      unit: null,
    });
  });

  it('lists documents with a Postgres array literal', async () => {
    jsRequest.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          id: 3,
          title: 'BAC S3E manual',
          doc_type: 'manual',
          source: 'generated',
          file_name: 'ct-manual.pdf',
          size_bytes: 120034,
          alarm_codes: '{CT-013,CT-014}',
          doc_date: '2026-09-01',
          status: 'READY',
          pages: 14,
          chunks: 42,
        },
      ],
    });
    const out = await api.listDocuments({ search: '  ', docType: 'manual', limit: 25, offset: 0 });
    expect(jsRequest.mock.calls[0][0].data).toEqual({ doc_type: 'manual', limit: 25, offset: 0 });
    expect(out.documents[0].alarmCodes).toEqual(['CT-013', 'CT-014']);
    expect(out.documents[0].unit).toBeNull();
  });

  it('sends rule changes as form values and parses the rule', async () => {
    const rule = {
      code: 'CT-014',
      name: 'Cooling Tower Heat Exchanger Fouling',
      lbnl_fault: 'Cooling tower fouling',
      description: 'Approach above expected',
      asset_scope: 'tower',
      signals: [{ lbnl: 'CT_SW_TEMP{n}', asset: 'CT_0{n}', param: 'cwst' }],
      params: { approach_excess_k: 1.0, persistence_min: 120 },
      defaults: { approach_excess_k: 1.0, persistence_min: 120 },
      calibration: null,
      calibrated_at: null,
      enabled: true,
      severity: 'WARNING',
      version: 2,
      updated_by: null,
      updated_at: '2026-10-10T06:00:00.000Z',
    };
    jsRequest.mockResolvedValueOnce({ ...rule, enabled: false, version: 3 });
    const r = await api.updateRule('CT-014', { enabled: false });
    expect(jsRequest.mock.calls[0][0]).toEqual({
      url: '/ai_insights/updaterule',
      data: { code: 'CT-014', enabled: 'false' },
    });
    expect(r).toMatchObject({ enabled: false, version: 3, assetScope: 'tower', calibration: null });

    jsRequest.mockResolvedValueOnce(rule);
    await api.updateRule('CT-014', { params: { approach_excess_k: 1.2, persistence_min: 120 } });
    expect(jsRequest.mock.calls[1][0].data).toEqual({
      code: 'CT-014',
      params: '{"approach_excess_k":1.2,"persistence_min":120}',
    });
  });

  it('parses the fault catalog and sends injections', async () => {
    jsRequest.mockResolvedValueOnce([
      {
        kind: 'ct_fouling',
        asset_kind: 'tower',
        assets: ['CT_01', 'CT_02', 'CT_03'],
        intensities: [0.95, 0.8, 0.65],
        unit: '',
        label: 'Cooling tower fouling',
        code: 'CT-014',
      },
    ]);
    const [c] = await api.getFaultCatalog();
    expect(c).toMatchObject({
      kind: 'ct_fouling',
      assetKind: 'tower',
      intensities: [0.95, 0.8, 0.65],
    });

    jsRequest.mockResolvedValueOnce({ status: 'SENT', request_id: 5, alias: 'CT_02' });
    await api.injectFault(12, 'ct_fouling', 0.8, 'inject');
    expect(jsRequest.mock.calls[1][0]).toEqual({
      url: '/digital_twin/injectfault',
      data: { asset_id: 12, fault: 'ct_fouling', value: 0.8, action: 'inject' },
    });

    // a clearance sends no intensity
    jsRequest.mockResolvedValueOnce({ status: 'SENT' });
    await api.injectFault(12, 'ct_fouling', null, 'clear');
    expect(jsRequest.mock.calls[2][0].data).toEqual({
      asset_id: 12,
      fault: 'ct_fouling',
      action: 'clear',
    });
  });

  it('lists the active plant faults with their catalog labels', async () => {
    jsRequest.mockResolvedValueOnce([
      {
        alias: 'CT_02',
        asset_id: 12,
        kind: 'ct_fouling',
        value: 0.8,
        sev: 1,
        start: '2026-10-10T05:00:00.000Z',
        label: 'Cooling tower heat exchanger fouling',
        code: 'CT-014',
      },
      {
        alias: 'CWP_02',
        asset_id: 9,
        kind: 'bearing_wear',
        value: null,
        sev: 0.35,
        start: '2026-10-09T05:00:00.000Z',
        label: null,
        code: null,
      },
    ]);
    const faults = await api.getActivePlantFaults();
    expect(faults[0]).toMatchObject({ assetId: 12, code: 'CT-014', value: 0.8 });
    expect(faults[1]).toMatchObject({ kind: 'bearing_wear', value: null, label: null });
  });

  describe('findAnomaly', () => {
    const T0 = Date.parse('2026-10-11T00:00:00Z');
    /** `n` anomaly rows, newest first, one minute apart, ids counting down from `top` */
    const page = (top: number, n: number, startMin = 0) =>
      Array.from({ length: n }, (_, i) => ({
        id: top - i,
        asset_id: 1,
        equipment_parameter_id: 77,
        param_alias: 'chwst',
        detector: 'zscore',
        severity: 'WARNING',
        details: {},
        started_at: new Date(T0 - (startMin + i) * 60_000).toISOString(),
        last_seen_at: new Date(T0).toISOString(),
        ended_at: null,
        status: 'ACTIVE',
      }));

    it('finds a recent anomaly in the unfiltered list', async () => {
      jsRequest.mockResolvedValueOnce(page(100, 30));
      expect(await api.findAnomaly(90)).toMatchObject({ id: 90, paramAlias: 'chwst' });
      expect(jsRequest).toHaveBeenCalledTimes(1);
      expect(jsRequest.mock.calls[0][0].data).toEqual({ limit: api.ANOMALY_PAGE });
    });

    it('pages back from the oldest start until it finds the anomaly', async () => {
      const first = page(2000, api.ANOMALY_PAGE);
      jsRequest
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(page(1501, api.ANOMALY_PAGE, api.ANOMALY_PAGE - 1));
      expect(await api.findAnomaly(1200)).toMatchObject({ id: 1200 });
      // rows before the oldest start of the first page, that start included
      const oldest = Date.parse(first[first.length - 1].started_at);
      expect(jsRequest.mock.calls[1][0].data).toEqual({
        to: new Date(oldest + 1).toISOString(),
        limit: api.ANOMALY_PAGE,
      });
    });

    it('returns null for an id that does not exist, after one request', async () => {
      jsRequest.mockResolvedValueOnce(page(2000, api.ANOMALY_PAGE));
      expect(await api.findAnomaly(99_999)).toBeNull();
      jsRequest.mockResolvedValueOnce(page(100, 30));
      expect(await api.findAnomaly(5)).toBeNull();
      expect(jsRequest).toHaveBeenCalledTimes(2);
    });

    it('stops after the page budget', async () => {
      jsRequest
        .mockResolvedValueOnce(page(5000, api.ANOMALY_PAGE))
        .mockResolvedValueOnce(page(4600, api.ANOMALY_PAGE, 400));
      expect(await api.findAnomaly(10, 2)).toBeNull();
      expect(jsRequest).toHaveBeenCalledTimes(2);
    });
  });
});
