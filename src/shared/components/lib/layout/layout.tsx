import '@digital-twin/reusables/styles/reusables.css';
import '../app.scss';

import { NotificationBell } from '@digital-twin/icons';
import { APP_NAME, formatDateHTMLInput, getURL, t, useLanguageSwitcher } from '@digital-twin/utils';
import {
  DvrFillIcon,
  DvrIcon,
  HeaderProduct,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  LogoutIcon,
  MainLayoutContainerProduct,
  PersonAddIcon,
  SettingsFillIcon,
  SettingsIcon,
  Sidebar,
} from '@digital-twin/reusables';
import { LazyRouteFunction } from '@remix-run/router/utils';
import clsx from 'clsx';
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
import styles from './layout.module.scss';
import { useNotification } from './notification-hook';
import { ThemeLogo } from './theme-logo';

type Menu = {
  icon?: ReactNode;
  filledIcon?: ReactNode;
  path?: string;
  title?: string;
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

const NotificationIcon = ({ notifCount }: { notifCount: number }) => {
  return (
    <div className={styles['notification-bell']}>
      <NotificationBell />
      <span className={styles['notification-count']}>{notifCount > 99 ? '99+' : notifCount}</span>
    </div>
  );
};

const SidebarHeader = ({ menus, adminMenus, icon, assistant }: SidebarHeaderProps) => {
  const matches = useMatches();
  const [crumbs, setCrumbs] = useState<
    {
      text: string;
      to: { pathname: string; search?: string };
    }[]
  >([]);
  const [activeBreadcrumbIndex, setActiveBreadcrumbIndex] = useState(0);
  const { hasPermission, signout, userData } = useContext(AuthCtx);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileConfigOpen, setProfileConfigOpen] = useState(false);
  const [searchParams] = useSearchParams();

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
      if (!menuItem.icon || !menuItem.path || !menuItem.title || !menuItem.filledIcon) {
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
  const filteredAdminMenus = filterMenu(adminMenus);

  const findActiveIndex = () => {
    const allMenus = [
      ...filteredMenus.map((menu, idx) => ({
        ...menu,
        parentIdx: 0,
        subIdx: idx,
      })),
      ...filteredAdminMenus.map((menu, idx) => ({
        ...menu,
        parentIdx: 1,
        subIdx: idx,
      })),
    ];

    const activeMenu = allMenus.find((menu) =>
      matches.some((match) => menu.path === match.pathname)
    );

    return activeMenu
      ? {
          menu: activeMenu.parentIdx,
          subMenu: activeMenu.subIdx,
          icon: activeMenu.filledIcon,
        }
      : { menu: 0, subMenu: 0, icon: null };
  };

  const activeIndex = findActiveIndex();

  const [expanded, setExpanded] = useState(activeIndex.menu);

  const filterParams = extractFilterSearchParams(searchParams);

  const createMenuItem = (
    text: string,
    icon: ReactNode,
    filledIcon: ReactNode,
    subMenus: Menu[],
    parentIdx: number
  ) => ({
    text,
    icon,
    iconFilled: filledIcon,
    collapsedRightIcon: <KeyboardArrowDownIcon />,
    expandedRightIcon: <KeyboardArrowUpIcon />,
    active: parentIdx === activeIndex.menu,
    isChildrenExpanded: parentIdx === expanded,
    subMenus: subMenus.map((subMenu, subIdx) => ({
      icon: subMenu.icon,
      iconFilled: subMenu.filledIcon,
      text: subMenu.title ?? '',
      to: {
        pathname: subMenu.path,
        search: `?${createSearchParams({
          ...filterParams,
        })}`,
      },
      active: parentIdx === activeIndex.menu && subIdx === activeIndex.subMenu,
    })),
  });

  const appMenuItems = createMenuItem(
    t('common.application'),
    <DvrIcon />,
    <DvrFillIcon />,
    filteredMenus,
    0
  );

  const adminMenuItems = createMenuItem(
    t('common.system_setup'),
    <SettingsIcon />,
    <SettingsFillIcon />,
    filteredAdminMenus,
    1
  );

  const menuItems =
    adminMenuItems.subMenus.length > 0 ? [appMenuItems, adminMenuItems] : [appMenuItems];

  // useEffect(() => {
  //   const notifIcon = document.querySelector(
  //     `.${styles['header']} > div > div`
  //   );
  //   if (notifIcon) {
  //     notifIcon.innerHTML = `<svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
  //   <path d="M10.6667 26C12.1333 26 13.3333 24.8 13.3333 23.3333H8C8 24.8 9.2 26 10.6667 26ZM18.6667 18V11.3333C18.6667 7.24 16.4933 3.81333 12.6667 2.90667V2C12.6667 0.893333 11.7733 0 10.6667 0C9.56 0 8.66667 0.893333 8.66667 2V2.90667C4.85333 3.81333 2.66667 7.22667 2.66667 11.3333V18L0 20.6667V22H21.3333V20.6667L18.6667 18ZM16 19.3333H5.33333V11.3333C5.33333 8.02667 7.34667 5.33333 10.6667 5.33333C13.9867 5.33333 16 8.02667 16 11.3333V19.3333Z" fill="white"/>
  //   </svg>${
  //     unreadNotificationCounts + incomingNotifCount > 0
  //       ? `<div style="position: absolute; top: -8px; left: 10px; background-color: red; color: #fff; border-radius: 8px; padding: 2px 5px; font-size: 12px;">${
  //           unreadNotificationCounts + incomingNotifCount
  //         }</div>`
  //       : ``
  //   }
  //   `;
  //   }
  // }, [unreadNotificationCounts, incomingNotifCount]);

  const [sidebarIsExpanded, setSidebarIsExpanded] = useState(false);

  return (
    <MainLayoutContainerProduct
      sidebar={
        <div className={styles['sidebar-container']}>
          <div className={styles['sidebar-wrapper']}>
            <Sidebar
              align={'right'}
              menuItems={menuItems}
              logoType={<span className={styles.title}>{APP_NAME}</span>}
              symbol={icon}
              onMenuClick={(menu) => {
                const menuIndex = menuItems.findIndex((m) => m.text === menu.text);
                setExpanded((prev) => (prev === menuIndex ? -1 : menuIndex));
              }}
              onSubMenuClick={(menu, _) => {
                const menuIndex = menuItems.findIndex((m) => m.text === menu.text);
                setExpanded(menuIndex);
              }}
              minWidth={80}
              maxWidth={328}
              expanded={sidebarIsExpanded}
              onExpandedChange={setSidebarIsExpanded}
            />
          </div>
          <ThemeLogo isExpanded={sidebarIsExpanded} minWidth={80} maxWidth={328} />
        </div>
      }
      header={
        <HeaderProduct
          className={styles['header']}
          breadcrumbProps={{
            icon: activeIndex.icon,
            items: crumbs.map((crumb, idx) => ({
              ...crumb,
              active: idx === activeBreadcrumbIndex,
            })),
            maxVisibleItems: 3,
            onClick: (crumb) =>
              setActiveBreadcrumbIndex(crumbs.findIndex((c) => c.text === crumb.text)),
          }}
          notificationProps={{
            count: unreadNotificationCounts + incomingNotifCount,
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
              />
            ),
            open: notificationOpen,
            onOpenChange: setNotificationOpen,
            icon: <NotificationIcon notifCount={unreadNotificationCounts + incomingNotifCount} />,
          }}
          userAvatarProps={{
            fullName: userData?.fullName ?? '',
            imgSrc: `${getURL()}/${userData?.photo}`,
            onClick: () => setProfileConfigOpen(true),
          }}
          userOptionsProps={{
            fullName: userData?.fullName ?? '',
            email: '',
            dropdownItems: [
              {
                prefixIcon: <PersonAddIcon />,
                id: 'my-profile',
                text: t('common.my_profile'),
                subItems: [],
              },
              {
                prefixIcon: <LogoutIcon />,
                id: 'sign-out',
                text: t('common.sign_out'),
                subItems: [],
              },
            ],
            onSelectItem: (_, item) => {
              if (item.id === 'my-profile') setProfileConfigOpen(true);
              else signout();
            },
          }}
        />
      }
    >
      <ProfileConfig open={profileConfigOpen} onClose={() => setProfileConfigOpen(false)} />
      <Outlet />
      {assistant}
    </MainLayoutContainerProduct>
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
                      adminMenus={adminRoutes}
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
                    path: '',
                    element: <Outlet />,
                    children: [
                      {
                        // Superuser, admin, and basic can access these routes
                        path: '',
                        element: <Outlet />,
                        children: adminRoutes.filter((item) => item.title === 'Theme Editor'),
                      },
                      {
                        // Superuser & admin can access these routes
                        path: '',
                        element: (
                          <AuthProtection isAdmin isProtected>
                            <Outlet />
                          </AuthProtection>
                        ),
                        children: adminRoutes.filter((item) =>
                          ['User Management', 'Notification Manager'].includes(item.title ?? '')
                        ),
                      },
                      {
                        // Only superuser can access these routes
                        path: '',
                        element: (
                          <AuthProtection isSuperUser isProtected>
                            <Outlet />
                          </AuthProtection>
                        ),
                        children: adminRoutes.filter((item) =>
                          ['Connection Manager', 'Master Data', 'License Manager'].includes(
                            item.title ?? ''
                          )
                        ),
                      },
                    ],
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
