import { describe, expect, it, vi } from 'vitest';

import { NavigationTarget, parseChatEvent } from './api/ai-assistant.api';
import {
  canOpenTarget,
  INSIGHTS_SELECTION_PARAM,
  INSIGHTS_TAB_PARAM,
  INSIGHTS_TABS,
  navigationDetail,
  navigationLink,
  navigationState,
  sameTarget,
  TWIN_REPLAY_PARAMS,
} from './navigation';

// the shared request layer imports the UI kit for its toasts (CSS that vitest cannot load)
vi.mock('@digital-twin/reusables', () => ({
  toast: { error: () => undefined, success: () => undefined },
}));

// ai-insights.hook.ts reads the auth context and the permission enums of the component library;
// the twin's replay source (whose URL parameters a test compares) the status enums and colours
vi.mock('@digital-twin/components', async () => {
  const { createContext } = await import('react');
  const { z } = await import('zod');
  return {
    ...(await import('../digital-twin/testing/digital-twin-components.mock')),
    AuthCtx: createContext({ hasPermission: () => false }),
    PermissionGroupAliasEnum: z.enum(['aiinsights', 'digitaltwin', 'simulation']),
    PermissionAliasEnum: z.enum(['read', 'create', 'update']),
  };
});

/** a target as the `navigate` event delivers it (snake_case payload, validated) */
const target = (data: Record<string, unknown>): NavigationTarget => {
  const e = parseChatEvent('navigate', data);
  if (e?.type !== 'navigate') throw new Error('not a navigation target');
  return e.target;
};

describe('navigate event', () => {
  it('maps the snake_case payload and fills the label', () => {
    expect(
      target({
        page: 'digital-twin',
        label: 'CT-01 fan speed in the digital twin',
        asset: 'CT_01',
        asset_id: 12,
        parameter: 'fan_speed',
        location: null,
        tab: null,
        item_id: null,
        view: 'walk',
        panel: null,
        section: null,
      })
    ).toEqual({
      page: 'digital-twin',
      label: 'CT-01 fan speed in the digital twin',
      asset: 'CT_01',
      assetId: 12,
      parameter: 'fan_speed',
      location: null,
      tab: null,
      itemId: null,
      view: 'walk',
      panel: null,
      section: null,
      filters: null,
    });
    // only the page is required; the label falls back to the page's title
    expect(target({ page: ' Alarm-Report ' })).toMatchObject({
      page: 'alarm-report',
      label: 'Alarm report',
      assetId: null,
      view: null,
    });
  });

  it('drops an unknown page and leaves malformed optional fields out', () => {
    expect(parseChatEvent('navigate', { page: 'admin-console', label: 'x' })).toBeNull();
    expect(parseChatEvent('navigate', { label: 'no page' })).toBeNull();
    expect(
      target({
        page: 'ai-insights',
        tab: 'Faults',
        item_id: '43',
        asset_id: -1,
        view: 'fly',
        section: 'a b"]',
        asset: 7,
      })
    ).toMatchObject({ tab: 'faults', itemId: 43, assetId: null, view: null, section: null });
    expect(target({ page: 'plant-overview' })).toMatchObject({
      page: 'plant-overview',
      label: 'Plant overview',
    });
  });

  it('keeps the filters as url key → trimmed strings, a malformed one left out', () => {
    expect(
      target({
        page: 'maintenance-order',
        filters: {
          severityIds: [1, '2'],
          search: ' pump ',
          'bad key': ['x'],
          empty: ['', '  '],
          flag: true,
        },
      }).filters
    ).toEqual({ severityIds: ['1', '2'], search: ['pump'] });
    expect(target({ page: 'maintenance-order', label: 'x', filters: 'status=open' })).toMatchObject(
      {
        page: 'maintenance-order',
        label: 'x',
        filters: null,
      }
    );
    expect(target({ page: 'maintenance-order', filters: ['open'] }).filters).toBeNull();
    const many = Array.from({ length: 70 }, (_, i) => i + 1);
    expect(target({ page: 'alarm-report', filters: { assetIds: many } }).filters?.assetIds).toEqual(
      many.slice(0, 60).map(String)
    );
    expect(
      target({ page: 'alarm-report', filters: { search: 'x'.repeat(65), start: '2026-10-14' } })
        .filters
    ).toEqual({ start: ['2026-10-14'] });
  });
});

describe('navigationLink', () => {
  it('builds the twin URL from the set fields only', () => {
    expect(
      navigationLink(
        target({
          page: 'digital-twin',
          asset: 'CT_01',
          parameter: 'fan_speed',
          location: 'Cooling Tower Yard',
          view: 'walk',
          panel: 'plant-overview',
        })
      )
    ).toBe(
      '/digital-twin?asset=CT_01&param=fan_speed&location=Cooling+Tower+Yard&view=walk&panel=plant-overview'
    );
    expect(navigationLink(target({ page: 'digital-twin', asset: 'CH_02' }))).toBe(
      '/digital-twin?asset=CH_02'
    );
    // orbit = leave walk mode: no view parameter
    expect(
      navigationLink(target({ page: 'digital-twin', location: 'CUB Roof', view: 'orbit' }))
    ).toBe('/digital-twin?location=CUB+Roof');
    expect(navigationLink(target({ page: 'digital-twin' }))).toBe('/digital-twin');
    // fields of other pages are ignored
    expect(navigationLink(target({ page: 'digital-twin', section: 'spc', tab: 'faults' }))).toBe(
      '/digital-twin'
    );
  });

  it('keeps a twin replay on when the twin is opened from it', () => {
    const replay = {
      pathname: '/digital-twin',
      search: '?node=yard&replay=12&variant=b&t=2026-10-11T08%3A00%3A00Z&view=walk',
    };
    const fan = target({ page: 'digital-twin', asset: 'CT_01', parameter: 'fan_speed' });
    // job, variant and the deep link's time stay (the playhead stays put); the rest is the target's
    expect(navigationLink(fan, replay)).toBe(
      '/digital-twin?asset=CT_01&param=fan_speed&replay=12&variant=b&t=2026-10-11T08%3A00%3A00Z'
    );
    expect(navigationLink(fan, { pathname: '/digital-twin', search: '?replay=12' })).toBe(
      '/digital-twin?asset=CT_01&param=fan_speed&replay=12'
    );
    // live twin, another page, other targets: just the target
    expect(navigationLink(fan, { pathname: '/digital-twin', search: '?node=yard&variant=b' })).toBe(
      '/digital-twin?asset=CT_01&param=fan_speed'
    );
    expect(navigationLink(fan, { pathname: '/simulation', search: '?replay=12' })).toBe(
      '/digital-twin?asset=CT_01&param=fan_speed'
    );
    expect(navigationLink(target({ page: 'simulation', item_id: 12 }), replay)).toBe(
      '/simulation?job=12'
    );
  });

  it('uses the replay URL parameters of the digital twin', async () => {
    const source = await import('../digital-twin/digital-twin.source');
    expect([...TWIN_REPLAY_PARAMS]).toEqual([
      source.REPLAY_PARAM,
      source.VARIANT_PARAM,
      source.TIME_PARAM,
    ]);
  });

  it('opens an AI Insights tab and its item', () => {
    const link = (tab: string | null, item_id: number | null) =>
      navigationLink(target({ page: 'ai-insights', tab, item_id }));
    expect(link('recommendations', 5)).toBe('/ai-insights?tab=recommendations&rec=5');
    expect(link('faults', 43)).toBe('/ai-insights?tab=faults&fault=43');
    expect(link('anomalies', 9)).toBe('/ai-insights?tab=anomalies&anomaly=9');
    expect(link('faults', null)).toBe('/ai-insights?tab=faults');
    // tabs without a selection, unknown tabs, no tab
    expect(link('documents', 3)).toBe('/ai-insights?tab=documents');
    expect(link('injection', null)).toBe('/ai-insights?tab=injection');
    expect(link('secrets', 3)).toBe('/ai-insights');
    expect(link(null, 3)).toBe('/ai-insights');
  });

  it('opens a simulation job or the scenario builder', () => {
    expect(navigationLink(target({ page: 'simulation', item_id: 12 }))).toBe('/simulation?job=12');
    expect(navigationLink(target({ page: 'simulation', section: 'new' }))).toBe(
      '/simulation?new=1'
    );
    expect(navigationLink(target({ page: 'simulation' }))).toBe('/simulation');
    // the plan form belongs to the fab workspace
    expect(navigationLink(target({ page: 'simulation', section: 'new-plan' }))).toBe(
      '/simulation?new=production&domain=fab'
    );
  });

  it('opens an equipment detail page at a section', () => {
    expect(navigationLink(target({ page: 'asset-overview', asset: 'CT_01', asset_id: 5 }))).toBe(
      '/asset-overview/5'
    );
    expect(
      navigationLink(target({ page: 'asset-overview', asset_id: 5, section: 'parameters' }))
    ).toBe('/asset-overview/5?section=parameters');
    expect(navigationLink(target({ page: 'asset-overview', asset_id: 5, section: 'status' }))).toBe(
      '/asset-overview/5?section=status'
    );
    // the SPC charts are the parameter list's second tab
    expect(navigationLink(target({ page: 'asset-overview', asset_id: 5, section: 'spc' }))).toBe(
      '/asset-overview/5?section=spc&show-spc-list=true'
    );
    // without the resolved id: the overview
    expect(navigationLink(target({ page: 'asset-overview', asset: 'CT_01' }))).toBe(
      '/asset-overview'
    );
  });

  it('opens every other page by its path, with a section when set', () => {
    expect(navigationLink(target({ page: 'alarm-report' }))).toBe('/alarm-report');
    expect(navigationLink(target({ page: 'maintenance-order', section: 'open-orders' }))).toBe(
      '/maintenance-order?section=open-orders'
    );
    expect(navigationLink(target({ page: 'early-warning-and-diagnostics' }))).toBe(
      '/early-warning-and-diagnostics'
    );
  });

  it('adds the filters of the page, in its key order, after what the branch set', () => {
    const link = (data: Record<string, unknown>) => navigationLink(target(data));
    expect(link({ page: 'production', section: 'scrap', filters: { tab: ['quality'] } })).toBe(
      '/production?section=scrap&tab=quality'
    );
    expect(link({ page: 'production', section: 'lots', filters: { 'lot-status': ['hold'] } })).toBe(
      '/production?tab=lots&lot-status=hold'
    );
    // a tab filter never overrides a tab section
    expect(link({ page: 'production', section: 'lots', filters: { tab: ['quality'] } })).toBe(
      '/production?tab=lots'
    );
    // object order does not count; repeated keys keep their order; unknown keys are dropped
    expect(
      link({
        page: 'maintenance-order',
        filters: {
          end: ['2026-10-18'],
          start: ['2026-10-12'],
          'no-locationIds-filter': ['true'],
          assetIds: ['1'],
          colour: ['red'],
          severityIds: ['1'],
          maintenanceStatusIds: ['1', '3', '4'],
        },
      })
    ).toBe(
      '/maintenance-order?maintenanceStatusIds=1&maintenanceStatusIds=3&maintenanceStatusIds=4&severityIds=1&assetIds=1&no-locationIds-filter=true&start=2026-10-12&end=2026-10-18'
    );
    expect(link({ page: 'alarm-report', filters: { assetIds: ['7', '2'] } })).toBe(
      '/alarm-report?assetIds=7&assetIds=2'
    );
    expect(
      link({
        page: 'alarm-report',
        section: 'events',
        filters: {
          eventview: ['true'],
          assetIds: ['4'],
          'no-locationIds-filter': ['true'],
          start: ['2026-10-14'],
          end: ['2026-10-14'],
        },
      })
    ).toBe(
      '/alarm-report?section=events&eventview=true&assetIds=4&no-locationIds-filter=true&start=2026-10-14&end=2026-10-14'
    );
    expect(link({ page: 'plant-overview', filters: { location: ['15'], period: ['30'] } })).toBe(
      '/plant-overview?location=15&period=30'
    );
    expect(
      link({ page: 'plant-overview', section: 'locations', filters: { location: ['16'] } })
    ).toBe('/plant-overview?section=locations&location=16');
    expect(
      link({
        page: 'asset-overview',
        asset_id: 4,
        section: 'alarms',
        filters: { recent: ['alarm'], date: ['2026-10-14'] },
      })
    ).toBe('/asset-overview/4?section=alarms&recent=alarm&date=2026-10-14');
    // the branch's own keys stay: the job, the plan form's workspace
    expect(
      link({ page: 'simulation', item_id: 12, filters: { job: ['9'], status: ['approval'] } })
    ).toBe('/simulation?job=12&status=approval');
    expect(
      link({ page: 'simulation', section: 'new-plan', filters: { domain: ['chiller'] } })
    ).toBe('/simulation?new=production&domain=fab');
    // the twin has no filters; AI Insights needs its tab
    expect(link({ page: 'digital-twin', asset: 'CT_01', filters: { asset: ['CT_02'] } })).toBe(
      '/digital-twin?asset=CT_01'
    );
    expect(link({ page: 'ai-insights', filters: { status: ['all'] } })).toBe('/ai-insights');
    expect(
      link({
        page: 'ai-insights',
        tab: 'faults',
        item_id: 43,
        filters: { hours: ['720'], status: ['CLEARED'] },
      })
    ).toBe('/ai-insights?tab=faults&fault=43&status=CLEARED&hours=720');
    // dates only as YYYY-MM-DD (a bad one crashes early-warning pages)
    expect(
      link({ page: 'alarm-report', filters: { start: ['2026-13-1x'], end: ['2026-10-14'] } })
    ).toBe('/alarm-report?end=2026-10-14');
    expect(link({ page: 'asset-overview', asset_id: 4, filters: { date: ['yesterday'] } })).toBe(
      '/asset-overview/4'
    );
  });

  it("keeps the user's own parameters on a same-page section switch", () => {
    const calendar = target({
      page: 'maintenance-order',
      section: 'calendar',
      filters: { view: ['calendar'] },
    });
    const from = {
      pathname: '/maintenance-order',
      search: '?start=2026-10-01&end=2026-10-15&severityIds=1&view=list&page=1',
    };
    expect(navigationLink(calendar, from)).toBe(
      '/maintenance-order?section=calendar&view=calendar&start=2026-10-01&end=2026-10-15&severityIds=1&page=1'
    );
    // a real filter: the target's URL alone
    expect(
      navigationLink(
        target({
          page: 'maintenance-order',
          section: 'calendar',
          filters: { view: ['calendar'], severityIds: ['2'] },
        }),
        from
      )
    ).toBe('/maintenance-order?section=calendar&view=calendar&severityIds=2');
    // another path (another unit's details): nothing copied
    expect(
      navigationLink(
        target({
          page: 'asset-overview',
          asset_id: 7,
          section: 'alarms',
          filters: { recent: ['alarm'] },
        }),
        { pathname: '/asset-overview/4', search: '?date=2026-10-01' }
      )
    ).toBe('/asset-overview/7?section=alarms&recent=alarm');
    // the section on show is never copied
    expect(
      navigationLink(target({ page: 'alarm-report', filters: { eventview: ['true'] } }), {
        pathname: '/alarm-report',
        search: '?section=report&start=2026-10-01',
      })
    ).toBe('/alarm-report?eventview=true&start=2026-10-01');
    // a section without filters keeps them too (these pages read their URL on every render)
    expect(
      navigationLink(target({ page: 'plant-overview', section: 'locations' }), {
        pathname: '/plant-overview',
        search: '?location=15&period=30',
      })
    ).toBe('/plant-overview?section=locations&location=15&period=30');
    expect(
      navigationLink(target({ page: 'production', section: 'kpi' }), {
        pathname: '/production',
        search: '?tab=quality&window=720',
      })
    ).toBe('/production?section=kpi&tab=quality&window=720');
    expect(
      navigationLink(target({ page: 'production', section: 'lots' }), {
        pathname: '/production',
        search: '?tab=quality&window=720',
      })
    ).toBe('/production?tab=lots&window=720');
    // the live parameters leave the SPC tab
    expect(
      navigationLink(target({ page: 'asset-overview', asset_id: 4, section: 'parameters' }), {
        pathname: '/asset-overview/4',
        search: '?show-spc-list=true&date=2026-10-01',
      })
    ).toBe('/asset-overview/4?section=parameters&date=2026-10-01');
    // not copied: the page itself, a new scenario next to the job on show
    expect(
      navigationLink(target({ page: 'maintenance-order' }), {
        pathname: '/maintenance-order',
        search: '?start=2026-10-01',
      })
    ).toBe('/maintenance-order');
    expect(
      navigationLink(target({ page: 'simulation', section: 'new' }), {
        pathname: '/simulation',
        search: '?job=5&status=failed',
      })
    ).toBe('/simulation?new=1');
  });
});

describe('navigation helpers', () => {
  it('describes what a target shows', () => {
    expect(
      navigationDetail(
        target({ page: 'digital-twin', asset: 'CT_01', parameter: 'fan_speed', view: 'walk' })
      )
    ).toBe('CT_01 · fan_speed · walk mode');
    expect(navigationDetail(target({ page: 'ai-insights', tab: 'faults', item_id: 43 }))).toBe(
      'faults #43'
    );
    expect(navigationDetail(target({ page: 'simulation', section: 'new' }))).toBe('new scenario');
    expect(
      navigationDetail(
        target({ page: 'asset-overview', asset: 'CH_01', asset_id: 1, section: 'spc' })
      )
    ).toBe('CH_01 · SPC');
    expect(navigationDetail(target({ page: 'alarm-report' }))).toBe('');
    // filters show as 'filtered' (the label names them); section-derived keys do not count
    expect(
      navigationDetail(target({ page: 'maintenance-order', filters: { severityIds: ['1'] } }))
    ).toBe('filtered');
    expect(
      navigationDetail(
        target({ page: 'production', section: 'scrap', filters: { tab: ['quality'] } })
      )
    ).toBe('scrap');
    expect(
      navigationDetail(
        target({
          page: 'maintenance-order',
          section: 'calendar',
          filters: { view: ['calendar'], severityIds: ['1'] },
        })
      )
    ).toBe('calendar · filtered');
    // a target that bypassed the schema (no filters property)
    const bare = {
      ...target({ page: 'alarm-report', section: 'events' }),
      filters: undefined,
    } as unknown as NavigationTarget;
    expect(navigationDetail(bare)).toBe('events');
    expect(navigationLink(bare)).toBe('/alarm-report?section=events');
  });

  it('checks Read on the permission group of the page route', () => {
    const asked: string[] = [];
    const hasPermission = (group: string, alias: string) => {
      asked.push(`${group}.${alias}`);
      return group === 'digitaltwin';
    };
    expect(canOpenTarget(target({ page: 'digital-twin' }), hasPermission)).toBe(true);
    expect(canOpenTarget(target({ page: 'ai-insights' }), hasPermission)).toBe(false);
    expect(canOpenTarget(target({ page: 'asset-overview' }), hasPermission)).toBe(false);
    expect(canOpenTarget(target({ page: 'plant-overview' }), hasPermission)).toBe(false);
    expect(asked).toEqual([
      'digitaltwin.read',
      'aiinsights.read',
      'equipmentoverview.read',
      'locationoverview.read',
    ]);
  });

  it('treats the same place with the same label as one target', () => {
    const a = target({ page: 'digital-twin', asset: 'CT_01', label: 'CT-01' });
    expect(sameTarget(a, target({ page: 'digital-twin', asset: 'CT_01', label: 'CT-01' }))).toBe(
      true
    );
    expect(sameTarget(a, target({ page: 'digital-twin', asset: 'CT_02', label: 'CT-01' }))).toBe(
      false
    );
    expect(sameTarget(a, target({ page: 'digital-twin', asset: 'CT_01', label: 'Fan' }))).toBe(
      false
    );
    const orders = (severityIds: string[]) =>
      target({ page: 'maintenance-order', label: 'Orders', filters: { severityIds } });
    expect(sameTarget(orders(['1']), orders(['1']))).toBe(true);
    expect(sameTarget(orders(['1']), orders(['2']))).toBe(false);
  });

  it('asks the page on show to remount for a link with filters', () => {
    const orders = target({ page: 'maintenance-order', filters: { severityIds: ['1'] } });
    const here = { pathname: '/maintenance-order', search: '?view=list' };
    expect(navigationState(target({ page: 'maintenance-order' }), here)).toBeUndefined();
    expect(navigationState(orders, { pathname: '/alarm-report', search: '' })).toBeUndefined();
    expect(navigationState(orders)).toBeUndefined();
    expect(
      navigationState(target({ page: 'digital-twin', filters: { asset: ['CT_01'] } }), {
        pathname: '/digital-twin',
        search: '',
      })
    ).toBeUndefined();
    const first = navigationState(orders, here)?.assistantNav;
    expect(typeof first).toBe('number');
    expect(navigationState(orders, here)?.assistantNav).toBeGreaterThan(first as number);
  });

  it('uses the URL parameters of the AI Insights page', async () => {
    const insights = await import('../ai-insights/ai-insights.hook');
    expect(INSIGHTS_TAB_PARAM).toBe(insights.TAB_PARAM);
    expect(INSIGHTS_SELECTION_PARAM).toEqual(insights.SELECTION_PARAM);
    expect(INSIGHTS_TABS).toEqual([...insights.INSIGHT_TABS]);
  });
});
