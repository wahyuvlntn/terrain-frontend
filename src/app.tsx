import {
  AuthCtx,
  getAssetNameById,
  Layout,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  ProgressBar,
  ProgressBarProvider,
  ReadAuthProtection,
  updateObjectMapping,
  withAuth,
} from '@digital-twin/components';
import {
  AFDDLogo,
  AlertAlarm,
  AlertAlarmFill,
  AssetV3,
  AssetV3Fill,
  Bulb,
  BulbFill,
  ChartAlert,
  ChartAlertFill,
  Cube,
  CubeFill,
  DatasetGrid,
  DatasetGridFill,
  HardwareChip,
  HardwareChipFill,
  Instruction,
  InstructionFill,
  MOrder,
  MOrderFill,
  MPerform,
  MPerformFill,
  Personnel,
  PersonnelFill,
  SettingAlert,
  SettingAlertFill,
  Timer,
  TimerFill,
  ToastError,
  ToastInfo,
  ToastSuccess,
  ToastWarning,
} from '@digital-twin/icons';
import bgImage from '@digital-twin/images/factory-plant.png';
import { Notification } from '@digital-twin/reusables';
import {
  APP_NAME,
  PROJECT_ALIAS,
  queryClientConfig,
  t,
  useLanguageSwitcher,
} from '@digital-twin/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy, Suspense, useContext, useEffect } from 'react';
import { defer, LoaderFunctionArgs, Outlet, redirect } from 'react-router-dom';
import z from 'zod';

import styles from './app.module.scss';
import { FILTER_KEY_TYPE, TypeShortcut, TypeTree } from './components';
import { AssistantBoundary } from './pages/ai-assistant/assistant-boundary';
import { getAllLocations, LocationType } from './pages/location-overview/api/location-overview.api';

const queryClient = new QueryClient(queryClientConfig);
const assetDetailsLoader = (args: LoaderFunctionArgs) => {
  const id = z.coerce.number().catch(0).parse(args.params.id);
  return defer({
    data: queryClient.ensureQueryData({
      queryFn: () => getAssetNameById(id),
      queryKey: ['ASSET_NAME', { id }],
    }),
  });
};

const locationOverviewLoader = (args: LoaderFunctionArgs) => {
  const locationHistoryParsed = JSON.parse(
    new URL(args.request.url).searchParams.get('locations') as string
  );
  const start = new URL(args.request.url).searchParams.get('start') as string;
  const end = new URL(args.request.url).searchParams.get('end') as string;

  return defer({
    data: queryClient.ensureQueryData({
      queryFn: async () => {
        const data = await getAllLocations();
        return {
          data,
          locationHistoryParsed,
          start,
          end,
        };
      },
      queryKey: ['ALL_LOCATIONS', { locations: locationHistoryParsed, start, end }],
    }),
  });
};

type PlantOverviewCrumbData = {
  rows: LocationType[] | null;
  location: string | null;
  period: string | null;
};

const plantOverviewLoader = (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  return defer({
    data: queryClient
      .ensureQueryData({ queryFn: getAllLocations, queryKey: ['getAllLocations'] })
      .then(
        (rows): PlantOverviewCrumbData => ({
          rows: rows as LocationType[] | null,
          location: url.searchParams.get('location'),
          period: url.searchParams.get('period'),
        })
      ),
  });
};

const LocationOverview = async () => ({
  Component: (await import('./pages/location-overview')).LocationOverview,
});

const AssetOverview = async () => ({
  Component: (await import('./pages/asset-overview')).AssetOverview,
});

const AssetDetail = async () => ({
  Component: (await import('./pages/asset-overview')).AssetDetails,
});

const AlarmReport = async () => ({
  Component: (await import('./pages/alarm-report')).AlarmReportAM,
});

const MaintenanceOrder = async () => ({
  Component: (await import('./pages/maintenance-order')).MaintenanceOrder,
});

const MaintenancePerformance = async () => ({
  Component: (await import('./pages/maintenance-performance')).MaintenancePerformance,
});

const InstructionList = async () => ({
  Component: (await import('./pages/maintenance-instruction')).InstructionList,
});

const InstructionDetail = async () => ({
  Component: (await import('./pages/maintenance-instruction')).InstructionDetail,
});

const InstructionForm = async () => ({
  Component: (await import('./pages/maintenance-instruction')).InstructionForm,
});

const PersonnelManagement = async () => ({
  Component: (await import('./pages/personnel-management')).PersonnelManagement,
});

const EarlyWarningAndDiagnostic = async () => ({
  Component: (await import('./pages/early-warning-and-diagnostics')).EarlyWarningAndDiagnostic,
});

const EarlyWarningDashboard = async () => ({
  Component: (await import('./pages/early-warning-dashboard')).EarlyWarningDashboard,
});

const PlantOverview = async () => ({
  Component: withAuth(
    (await import('./pages/plant-overview')).PlantOverview,
    PermissionGroupAliasEnum.enum.locationoverview
  ),
});

const DigitalTwin = async () => ({
  // a lazy route gets no ReadAuthProtection from the module list below: the page enforces it
  Component: withAuth(
    (await import('./pages/digital-twin')).DigitalTwin,
    PermissionGroupAliasEnum.enum.digitaltwin
  ),
});

const AiInsights = async () => ({
  // lazy routes enforce the read permission themselves (see DigitalTwin)
  Component: withAuth(
    (await import('./pages/ai-insights')).AiInsights,
    PermissionGroupAliasEnum.enum.aiinsights
  ),
});

const SimulationJobs = async () => ({
  Component: withAuth(
    (await import('./pages/simulation')).SimulationJobs,
    PermissionGroupAliasEnum.enum.simulation
  ),
});

const Production = async () => ({
  Component: withAuth(
    (await import('./pages/production')).Production,
    PermissionGroupAliasEnum.enum.production
  ),
});

const ThemePreviewWebContent = lazy(() => import('./pages/theme-editor/preview-web'));

const AiAssistantPanel = lazy(async () => ({
  default: (await import('./pages/ai-assistant')).AiAssistant,
}));

/**
 * The floating AI assistant on every signed-in page (Layout slot). Its chunk loads only for users
 * with AI Assistant › Read, and a failure stays inside the boundary instead of breaking the page.
 */
const AiAssistant = () => {
  const { userData, hasPermission } = useContext(AuthCtx);
  if (
    !userData ||
    !hasPermission(PermissionGroupAliasEnum.enum.aiassistant, PermissionAliasEnum.enum.read)
  ) {
    return null;
  }
  return (
    <AssistantBoundary>
      <Suspense fallback={null}>
        <AiAssistantPanel />
      </Suspense>
    </AssistantBoundary>
  );
};

const App = () => {
  const { currentLanguage } = useLanguageSwitcher();
  useEffect(() => updateObjectMapping(), [currentLanguage]);
  return (
    <QueryClientProvider client={queryClient}>
      <Notification
        key={currentLanguage}
        autoClose={5000}
        position={'top-right'}
        toastContainerProps={{
          // react-toastify 11: a className callback replaces the default classes, so keep them
          toastClassName: (data) => {
            const base = data?.defaultClassName ?? '';
            if (data?.type === 'success') return `${base} ${styles['toast-success']}`;
            if (data?.type === 'error') return `${base} ${styles['toast-error']}`;
            if (data?.type === 'warning') return `${base} ${styles['toast-warning']}`;
            if (data?.type === 'info') return `${base} ${styles['toast-info']}`;
            return base;
          },
          theme: 'light',
          icon: ({ type }) => {
            if (type === 'success') return <ToastSuccess />;
            if (type === 'error') return <ToastError />;
            if (type === 'warning') return <ToastWarning />;
            if (type === 'info') return <ToastInfo />;
          },
          hideProgressBar: true,
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      <ProgressBarProvider>
        <Layout
          key={currentLanguage}
          loginTitle={APP_NAME}
          loginBgImageUrl={bgImage}
          loginProductLogo={<AFDDLogo width={80} height={80} className="shrink-0" />}
          icon={<AFDDLogo />}
          projectVariant={PROJECT_ALIAS()}
          modules={[
            {
              index: true,
              loader: () => redirect('/plant-overview'),
            },
            {
              path: '/plant-overview',
              icon: <DatasetGrid />,
              filledIcon: <DatasetGridFill />,
              title: 'Plant Overview',
              permissionGroupAlias: PermissionGroupAliasEnum.enum.locationoverview,
              handle: {
                crumb: () => 'Plant Overview',
              },
              element: <Outlet />,
              children: [
                {
                  index: true as const,
                  lazy: PlantOverview,
                  loader: plantOverviewLoader,
                  handle: {
                    // the drilled-into location and its ancestors
                    crumb: async ({ data }: { data: Promise<PlantOverviewCrumbData> }) => {
                      const { rows, location, period } = await data;
                      const byId = new Map((rows ?? []).map((r) => [r.locationId, r]));
                      const chain: LocationType[] = [];
                      let id = location ? Number(location) : null;
                      while (id !== null && byId.has(id) && chain.length < 20) {
                        const row = byId.get(id) as LocationType;
                        chain.unshift(row);
                        id = row.parentId !== null && row.parentId !== id ? row.parentId : null;
                      }
                      // crumb objects ({ text, to.search }) are read by the layout like the
                      // location overview's; the handle's type only knows strings
                      return chain.map((row) => ({
                        text: row.locationName,
                        to: {
                          search: {
                            location: String(row.locationId),
                            ...(period ? { period } : {}),
                          },
                        },
                      })) as unknown as string[];
                    },
                  },
                },
              ],
            },
            {
              path: '/digital-twin',
              icon: <Cube />,
              filledIcon: <CubeFill />,
              title: 'Digital Twin',
              permissionGroupAlias: PermissionGroupAliasEnum.enum.digitaltwin,
              handle: {
                crumb: () => 'Digital Twin',
              },
              lazy: DigitalTwin,
            },
            {
              path: '/simulation',
              icon: <Timer />,
              filledIcon: <TimerFill />,
              title: 'Simulation',
              permissionGroupAlias: PermissionGroupAliasEnum.enum.simulation,
              handle: {
                crumb: () => 'Simulation',
              },
              lazy: SimulationJobs,
            },
            {
              path: '/ai-insights',
              icon: <Bulb />,
              filledIcon: <BulbFill />,
              title: 'AI Insights',
              permissionGroupAlias: PermissionGroupAliasEnum.enum.aiinsights,
              handle: {
                crumb: () => 'AI Insights',
              },
              lazy: AiInsights,
            },
            {
              path: '/early-warning-and-diagnostics',
              icon: <SettingAlert />,
              filledIcon: <SettingAlertFill />,
              title: 'Early Warning & Diagnostics',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.earlywarningdiagnostics,
              handle: {
                crumb: () => 'Early Warning & Diagnostics',
              },
              lazy: EarlyWarningAndDiagnostic,
            },
            {
              path: '/maintenance-order',
              icon: <MOrder />,
              filledIcon: <MOrderFill />,
              title: 'Maintenance Order',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.maintenanceorder,
              handle: {
                crumb: () => 'Maintenance Order',
              },
              lazy: MaintenanceOrder,
            },
            {
              path: '/production',
              icon: <HardwareChip />,
              filledIcon: <HardwareChipFill />,
              title: 'Production',
              permissionGroupAlias: PermissionGroupAliasEnum.enum.production,
              handle: {
                crumb: () => 'Production',
              },
              lazy: Production,
            },
            // routed for links from notifications and the AI assistant, not in the menu
            {
              path: '/location-overview',
              icon: <DatasetGrid />,
              filledIcon: <DatasetGridFill />,
              hideInMenu: true,
              title: t('common.location_overview'),
              permissionGroupAlias: PermissionGroupAliasEnum.enum.locationoverview,
              handle: {
                crumb: () => t('common.location_overview'),
              },
              element: <Outlet />,
              children: [
                {
                  index: true,
                  lazy: LocationOverview,
                  loader: locationOverviewLoader,
                  handle: {
                    crumb: async ({ data }: Awaited<ReturnType<typeof locationOverviewLoader>>) => {
                      const awaitedData = await data;

                      const locationData = awaitedData.data as LocationType[];
                      const locationHistoryParsed = awaitedData.locationHistoryParsed as string[];
                      // const start = awaitedData.start as string;
                      // const end = awaitedData.end as string;

                      const rawBreadcrumbs =
                        (locationData &&
                          locationHistoryParsed &&
                          locationData
                            .filter((location: LocationType) =>
                              locationHistoryParsed.find(
                                (item: string) => parseInt(item) === location.locationId
                              )
                            )
                            .sort((a, b) => a.hierarchy - b.hierarchy)) ||
                        [];

                      const allBreadcrumbs = [...rawBreadcrumbs];
                      const crumbs = [];
                      const beforeLocations = [];
                      for (let i = 0; i < allBreadcrumbs.length; i++) {
                        beforeLocations.push(allBreadcrumbs[i]?.locationId?.toString());
                        crumbs.push({
                          text: allBreadcrumbs[i].locationName,
                          to: {
                            search: {
                              locations: JSON.stringify(beforeLocations),
                              location_id: allBreadcrumbs[i].locationId,
                            },
                          },
                        });
                      }

                      const filteredCrumbs = crumbs.filter(
                        (crumb) => crumb.text
                      ) as unknown as Record<string, unknown>;
                      return filteredCrumbs;
                    },
                  },
                },
              ],
            },
            {
              path: '/asset-overview',
              icon: <AssetV3 />,
              filledIcon: <AssetV3Fill />,
              hideInMenu: true,
              title: t('common.equipment_overview'),
              permissionGroupAlias: PermissionGroupAliasEnum.enum.equipmentoverview,
              handle: {
                crumb: () => t('common.equipment_overview'),
              },
              element: <Outlet />,
              children: [
                {
                  index: true,
                  lazy: AssetOverview,
                },
                {
                  lazy: AssetDetail,
                  path: '/asset-overview/:id',
                  loader: assetDetailsLoader,
                  handle: {
                    crumb: async ({ data }: Awaited<ReturnType<typeof assetDetailsLoader>>) => {
                      return await data;
                    },
                  },
                },
              ],
            },
            {
              path: '/alarm-report',
              icon: <AlertAlarm />,
              filledIcon: <AlertAlarmFill />,
              hideInMenu: true,
              title: t('common.alarm_report'),
              permissionGroupAlias: PermissionGroupAliasEnum.enum.alarmsreport,
              handle: {
                crumb: () => t('common.alarm_report'),
              },
              lazy: AlarmReport,
            },
            {
              path: '/maintenance-performance',
              icon: <MPerform />,
              filledIcon: <MPerformFill />,
              hideInMenu: true,
              title: 'Maintenance Performance',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.maintenanceperformance,
              handle: {
                crumb: () => 'Maintenance Performance',
              },
              lazy: MaintenancePerformance,
            },
            {
              path: '/maintenance-instruction',
              icon: <Instruction />,
              filledIcon: <InstructionFill />,
              hideInMenu: true,
              title: 'Maintenance Instruction',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.maintenanceinstruction,
              handle: {
                crumb: () => 'Maintenance Instruction',
              },
              element: <Outlet />,
              children: [
                {
                  path: 'new',
                  lazy: InstructionForm,
                },
                {
                  path: '',
                  lazy: InstructionList,
                  children: [
                    {
                      path: ':instructionId',
                      lazy: InstructionDetail,
                    },
                  ],
                },
                {
                  path: ':instructionId/edit',
                  lazy: InstructionForm,
                },
              ],
            },
            {
              path: '/personnel-management',
              icon: <Personnel />,
              filledIcon: <PersonnelFill />,
              hideInMenu: true,
              title: 'Personnel Management',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.personnelmanagement,
              handle: {
                crumb: () => 'Personnel Management',
              },
              lazy: PersonnelManagement,
            },
            {
              path: '/early-warning-dashboard',
              icon: <ChartAlert />,
              filledIcon: <ChartAlertFill />,
              hideInMenu: true,
              title: 'Early Warning Dashboard',
              //TODO: change permission
              permissionGroupAlias: PermissionGroupAliasEnum.enum.earlywarningdashboard,
              handle: {
                crumb: () => 'Early Warning Dashboard',
              },
              lazy: EarlyWarningDashboard,
            },
          ].map((module) => ({
            ...module,
            element:
              module.element && module.permissionGroupAlias ? (
                <ReadAuthProtection permissionGroupAlias={module.permissionGroupAlias}>
                  {module.element}
                </ReadAuthProtection>
              ) : undefined,
          }))}
          equipmentManagerFilterTypeTree={<TypeTree />}
          equipmentManagerFilterTypeShortcut={<TypeShortcut />}
          equipmentManagerFilterTypeKey={FILTER_KEY_TYPE}
          ThemePreviewWebContent={ThemePreviewWebContent}
          assistant={<AiAssistant />}
        />
        <ProgressBar />
      </ProgressBarProvider>
    </QueryClientProvider>
  );
};

export default App;
