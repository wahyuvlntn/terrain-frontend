import '@digital-twin/reusables/styles/reusables.css';
import '../app.scss';

import { APP_NAME, formatDateHTMLInput, getURL, t, useLanguageSwitcher } from '@digital-twin/utils';
import {
  DvrFillIcon,
  DvrIcon,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  Sidebar,
} from '@digital-twin/reusables';
import { LazyRouteFunction } from '@remix-run/router/utils';
import {
  ComponentType,
  LazyExoticComponent,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { IndexRouteObject, NonIndexRouteObject } from 'react-router/dist/lib/context';
import {
  createBrowserRouter,
  createSearchParams,
  Navigate,
  Outlet,
  RouterProvider,
  useMatches,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  AuthCtx,
  AuthCtxProvider,
  AuthProtection,
  FILTER_KEY_ALARM,
  FILTER_KEY_CONDITION,
  FILTER_KEY_LICENSE,
  FILTER_KEY_MODEL,
  FILTER_KEY_STATUS,
  Login,
  NotificationList,
  PermissionAliasEnum,
  ProjectCtx,
  TPermissionGroupAliasEnum,
} from '../feat';
import { getRoutes as getAdminRoutes } from '../feat/admin';
import { ThemeProvider } from '../feat/admin/theme-editor';
import { THideStatusColors } from '../feat/admin/theme-editor/theme-details';
import { FILTER_KEY_BRAND } from '../feat/filter/filter.brand';
import { FILTER_KEY_ASSET, FILTER_KEY_LOCATION } from '../feat/filter/filter.location';
import { FILTER_KEY_SERIES } from '../feat/filter/filter.series';
import { ProfileConfig } from '../feat/profile-configuration';
import { AppShell } from './app-shell';
import styles from './layout.module.scss';
import { useNotification } from './notification-hook';
import { useOutletKey } from './outlet-key';
import { ThemeLogo } from './theme-logo';

type Menu = {
  icon?: ReactNode;
  filledIcon?: ReactNode;
  path?: string;
  title?: string;
  /** routed (links from notifications, the assistant) but not listed in the sidebar */
  hideInMenu?: boolean;
  permissionGroupAlias?: TPermissionGroupAliasEnum;
};

type SidebarMenu = Menu & {
  children?: {
    permissionGroupAlias?: TPermissionGroupAliasEnum;
    index?: boolean;
  }[];
};

interface SidebarHeaderProps {
  menus: Menu[];
  adminMenus: Menu[];
  icon: ReactNode;
  /** rendered after the page outlet (e.g. a floating assistant) */
  assistant?: ReactNode;
}

export const extractFilterSearchParams = (searchParams: URLSearchParams) => {
  const filterKeys = [
    FILTER_KEY_LOCATION,
    FILTER_KEY_ASSET,
    FILTER_KEY_MODEL,
    FILTER_KEY_STATUS,
    FILTER_KEY_CONDITION,
    FILTER_KEY_ALARM,
    FILTER_KEY_LICENSE,
    FILTER_KEY_SERIES,
    FILTER_KEY_BRAND,
    'typeIds',
    'powerTypeIds',
  ];

  const filterParams: { [key: string]: string | string[] } = {};

  for (const entry of searchParams.entries()) {
    const key = entry[0];
    if ([...filterKeys, 'start', 'end'].includes(key)) {
      const data = filterParams[key];
      let value = entry[1];
      const max = formatDateHTMLInput(new Date());
      if ((key === 'end' || key === 'start') && value > max) {
        value = max;
      }
      if (data) filterParams[key] = [...data, value];
      else filterParams[key] = [value];
    } else if (filterKeys.map((item) => `no-${item}-filter`).includes(key))
      filterParams[key] = entry[1];
  }
  return filterParams;
};

const SidebarHeader = ({ menus, adminMenus, icon, assistant }: SidebarHeaderProps) => {
  const matches = useMatches();
  const [crumbs, setCrumbs] = useState<
    {
      text: string;
      to: { pathname: string; search?: string };
    }[]
  >([]);
  const { hasPermission, signout, userData } = useContext(AuthCtx);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileConfigOpen, setProfileConfigOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const outletKey = useOutletKey();

  const { currentLanguage } = useLanguageSwitcher();

  const {
    notifType,
    from,
    handleReadAllNotif,
    handleReadUnread,
    handleDateChange,
    handleTypeChange,
    handleSearchChange,
    fetchNextPage,
    incomingNotifCount,
    incomingNotifications,
    isLoading,
    notifications,
    search,
    to,
    uniqueDt,
    unreadNotificationCounts,
  } = useNotification(notificationOpen);

  useEffect(() => {
    const fetchCrumbs = () => {
      const promises = matches
        // @ts-expect-error match.handle has crumb function
        .filter((match) => Boolean(match.handle?.crumb))
        .map(async (match) => {
          // @ts-expect-error match.handle has crumb function
          const data = await match.handle.crumb(match.data);
          if (Array.isArray(data))
            return data.map((i) => {
              if (typeof i === 'object')
                return {
                  text: i?.text,
                  to: {
                    pathname: i?.to?.pathname,
                    search: `?${createSearchParams({
                      ...extractFilterSearchParams(searchParams),
                      ...i?.to?.search,
                    })}`,
                  },
                };
              return {
                text: String(i) ?? '',
                to: {
                  pathname: match.pathname,
                  search: `?${createSearchParams({
                    ...extractFilterSearchParams(searchParams),
                  })}`,
                },
              };
            });

          if (typeof data === 'object')
            return {
              text: data?.text,
              to: {
                pathname: data?.to?.pathname,
                search: `?${createSearchParams({
                  ...extractFilterSearchParams(searchParams),
                  ...data?.to?.search,
                })}`,
              },
            };

          return {
            text: String(data) ?? '',
            to: {
              pathname: match.pathname,
              search: `?${createSearchParams({
                ...extractFilterSearchParams(searchParams),
              })}`,
            },
          };
        });

      Promise.all(promises).then((data) => setCrumbs(data.flat(1)));
    };

    fetchCrumbs();
  }, [matches, currentLanguage, searchParams]);

  const isAuthorized = (pg: TPermissionGroupAliasEnum | undefined) =>
    pg ? hasPermission(pg, PermissionAliasEnum.enum.read) : true;

  const filterMenu = (menus: SidebarMenu[]) =>
    menus.filter((menuItem) => {
      if (
        menuItem.hideInMenu ||
        !menuItem.icon ||
        !menuItem.path ||
        !menuItem.title ||
        !menuItem.filledIcon
      ) {
        return false;
      }
      // Basic user cannot access these pages
      if (
        userData?.role === 'basic' &&
        [
          'Connection Manager',
          'Master Data',
          'License Manager',
          'User Management',
          'Notification Manager',
        ].includes(menuItem.title)
      ) {
        return false;
      }

      // Admin user cannot access these pages
      if (
        userData?.role === 'admin' &&
        ['Connection Manager', 'Master Data', 'License Manager'].includes(menuItem.title)
      ) {
        return false;
      }

      if (menuItem.permissionGroupAlias) {
        return isAuthorized(menuItem.permissionGroupAlias);
      }

      return !menuItem.children
        ?.filter((item) => !item.index)
        ?.every((item) => !isAuthorized(item.permissionGroupAlias));
    });

  const filteredMenus = filterMenu(menus);
  const activeMenu = filteredMenus.find((menu) =>
    matches.some((match) => menu.path === match.pathname)
  );
  const filterParams = extractFilterSearchParams(searchParams);

  // the original sidebar: one "Application" group holding the pages
  const [expanded, setExpanded] = useState(0);
  const [sidebarIsExpanded, setSidebarIsExpanded] = useState(false);
  const menuItems = [
    {
      text: t('common.application'),
      icon: <DvrIcon />,
      iconFilled: <DvrFillIcon />,
      collapsedRightIcon: <KeyboardArrowDownIcon />,
      expandedRightIcon: <KeyboardArrowUpIcon />,
      active: Boolean(activeMenu),
      isChildrenExpanded: expanded === 0,
      subMenus: filteredMenus.map((menu) => ({
        icon: menu.icon,
        iconFilled: menu.filledIcon,
        text: menu.title ?? '',
        to: { pathname: menu.path, search: `?${createSearchParams({ ...filterParams })}` },
        active: menu === activeMenu,
      })),
    },
  ];

  return (
    <AppShell
      sidebar={
        <div className={styles['sidebar-container']}>
          <div className={styles['sidebar-wrapper']}>
            <Sidebar
              align={'right'}
              menuItems={menuItems}
              logoType={<span className={styles.title}>{APP_NAME}</span>}
              symbol={icon}
              onMenuClick={() => setExpanded((prev) => (prev === 0 ? -1 : 0))}
              onSubMenuClick={() => setExpanded(0)}
              minWidth={80}
              maxWidth={328}
              expanded={sidebarIsExpanded}
              onExpandedChange={setSidebarIsExpanded}
            />
          </div>
          <ThemeLogo isExpanded={sidebarIsExpanded} minWidth={80} maxWidth={328} />
        </div>
      }
      icon={activeMenu?.filledIcon}
      crumbs={crumbs}
      notifications={{
        count: unreadNotificationCounts + incomingNotifCount,
        open: notificationOpen,
        onOpenChange: setNotificationOpen,
        children: (
          <NotificationList
            from={from}
            to={to}
            handleDateChange={handleDateChange}
            handleReadAllNotif={handleReadAllNotif}
            handleReadUnread={handleReadUnread}
            handleTypeChange={handleTypeChange}
            handleSearchChange={handleSearchChange}
            fetchNextPage={fetchNextPage}
            incomingNotifCount={incomingNotifCount}
            incomingNotifications={incomingNotifications}
            isLoading={isLoading}
            notifType={notifType}
            notifications={notifications}
            search={search}
            uniqueDt={uniqueDt}
            unreadNotificationCounts={unreadNotificationCounts}
            onNavigate={() => setNotificationOpen(false)}
          />
        ),
      }}
      user={{
        fullName: userData?.fullName ?? '',
        role: userData?.role,
        photo: userData?.photo ? `${getURL()}/${userData.photo}` : undefined,
        labels: {
          myProfile: t('common.my_profile'),
          themeEditor: t('common.theme_editor'),
          signOut: t('common.sign_out'),
        },
        onAction: (key) => {
          if (key === 'my-profile') setProfileConfigOpen(true);
          else if (key === 'theme-editor') navigate('/theme-editor');
          else signout();
        },
      }}
    >
      <ProfileConfig open={profileConfigOpen} onClose={() => setProfileConfigOpen(false)} />
      <Outlet key={outletKey} />
      {assistant}
    </AppShell>
  );
};

type TReturnTypeCrumb = string | { text?: string; to?: string };
type THandle = {
  handle?: {
    crumb: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      param: any
    ) =>
      | TReturnTypeCrumb
      | TReturnTypeCrumb[]
      | Promise<TReturnTypeCrumb>
      | Promise<TReturnTypeCrumb[]>;
  };
};
type TIndexRouteObject = Omit<IndexRouteObject, 'handle' | 'lazy'> &
  THandle & {
    lazy?: LazyRouteFunction<TRouteObject>;
  };
type TNonIndexRouteObject = Omit<NonIndexRouteObject, 'handle' | 'children' | 'lazy'> &
  THandle & {
    lazy?: LazyRouteFunction<TRouteObject>;
    children?: TRouteObject[];
  };
type TRouteObject = TIndexRouteObject | TNonIndexRouteObject;

export type Module = TRouteObject & Menu;

interface LayoutProps {
  modules: Module[];
  additionalAdminModules?: (Module & { position: number })[];
  projectVariant: string;
  icon: ReactNode;
  equipmentManagerFilterTypeTree: ReactNode;
  equipmentManagerFilterTypeShortcut: ReactNode;
  equipmentManagerFilterTypeKey: string;
  loginTitle: string;
  loginProductLogo: ReactNode;
  loginBgImageUrl: string;
  ThemePreviewWebContent: LazyExoticComponent<ComponentType<{ onLoad: () => void }>>;
  themeHideStatusColors?: THideStatusColors;
  /**
   * Optional element shown on every signed-in page, after the page content (e.g. a floating
   * AI assistant). It renders inside the router, the auth context, the theme and react-query.
   */
  assistant?: ReactNode;
}

export const Layout = ({
  modules,
  projectVariant,
  additionalAdminModules,
  icon,
  equipmentManagerFilterTypeKey,
  equipmentManagerFilterTypeShortcut,
  equipmentManagerFilterTypeTree,
  loginBgImageUrl,
  loginProductLogo,
  loginTitle,
  ThemePreviewWebContent,
  themeHideStatusColors,
  assistant,
}: LayoutProps) => {
  const adminRoutes = getAdminRoutes({
    additionalRoutes: additionalAdminModules,
    equipmentManagerFilterTypeKey,
    equipmentManagerFilterTypeShortcut,
    equipmentManagerFilterTypeTree,
    themePreviewWebContent: ThemePreviewWebContent,
    themeHideStatusColors,
  });

  return (
    <ThemeProvider>
      <RouterProvider
        router={createBrowserRouter([
          {
            path: '/',
            element: (
              <ProjectCtx.Provider value={{ projectVariant }}>
                <AuthCtxProvider />
              </ProjectCtx.Provider>
            ),
            children: [
              {
                path: '',
                element: (
                  <AuthProtection isProtected>
                    <SidebarHeader
                      menus={modules}
                      // demo build: no administration pages (the theme editor is in the user menu)
                      adminMenus={[]}
                      icon={icon}
                      assistant={assistant}
                    />
                  </AuthProtection>
                ),
                children: [
                  {
                    path: '',
                    element: <Outlet />,
                    children: modules,
                  },
                  {
                    // demo build: of the administration pages only the theme editor remains
                    path: '',
                    element: <Outlet />,
                    children: adminRoutes.filter((item) => item.path === '/theme-editor'),
                  },
                ],
              },
              {
                path: 'signin',
                element: (
                  <AuthProtection isProtected={false}>
                    <Login
                      bgImageUrl={loginBgImageUrl}
                      productLogo={loginProductLogo}
                      title={loginTitle}
                    />
                  </AuthProtection>
                ),
              },
              {
                path: '*',
                element: <Navigate to={'/'} />,
              },
            ],
          },
        ])}
      />
    </ThemeProvider>
  );
};
