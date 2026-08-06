/* eslint-disable simple-import-sort/imports */
import {
  Connection,
  ConnectionFill,
  Database,
  DatabaseFill,
  LicenseIcon,
  LicenseIconFill,
  ManageAccounts,
  ManageAccountsFill,
  NotificationSettings,
  NotificationSettingsFill,
  Themeicon,
  ThemeiconFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import { redirect } from 'react-router-dom';

import { Module } from '../../layout';
import { PermissionGroupAliasEnum, withAuth } from '../auth';
import { getRoutes as getConnectionManagerRoutes } from './connection-manager';
import { ThemeEditorProps } from './theme-editor';
import { THideStatusColors } from './theme-editor/theme-details';

const ThemeEditor = (props: ThemeEditorProps) => {
  return import('./theme-editor').then((module) => ({
    Component: withAuth(
      () => <module.ThemeEditor {...props} />,
      PermissionGroupAliasEnum.enum.themeeditor
    ),
  }));
};

const MasterData = async () => ({
  Component: withAuth((await import('./master-data')).MasterData),
});

const ConnectionManager = async () => ({
  Component: withAuth((await import('./connection-manager')).ConnectionManager),
});

const UserManagement = async () => ({
  Component: withAuth((await import('./user-management')).UserManagement),
});

const NotificationManager = async () => ({
  Component: withAuth(
    (await import('./notification-manager/NotificationManager')).default,
    PermissionGroupAliasEnum.enum.notificationmanager
  ),
});

const LicenseManager = async () => ({
  Component: withAuth(
    (await import('./license-manager')).LicenseManager,
    PermissionGroupAliasEnum.enum.licensemanager
  ),
});

type TGetRoutesParams = {
  additionalRoutes?: (Module & { position: number })[];
  equipmentManagerFilterTypeTree: ReactNode;
  equipmentManagerFilterTypeShortcut: ReactNode;
  equipmentManagerFilterTypeKey: string;
  themePreviewWebContent: LazyExoticComponent<
    ComponentType<{ onLoad: () => void }>
  >;
  themeHideStatusColors?: THideStatusColors;
};
export const getRoutes = ({
  themePreviewWebContent,
  themeHideStatusColors,
  additionalRoutes,
  equipmentManagerFilterTypeKey,
  equipmentManagerFilterTypeShortcut,
  equipmentManagerFilterTypeTree,
}: TGetRoutesParams) => {
  const routes: Module[] = [
    {
      path: '/connection-manager',
      //TODO: missing translation
      title: t('common.connection_manager'),
      handle: {
        crumb: () => t('common.connection_manager'),
      },
      icon: <Connection />,
      filledIcon: <ConnectionFill />,
      lazy: ConnectionManager,
      children: [
        {
          index: true,
          loader: () => redirect('location-manager'),
        },
        ...getConnectionManagerRoutes({
          equipmentManagerFilterTypeKey,
          equipmentManagerFilterTypeShortcut,
          equipmentManagerFilterTypeTree,
        }),
      ],
    },
    {
      path: '/master-data',
      lazy: MasterData,
      title: t('common.master_data'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.masterdata,
      handle: {
        crumb: () => t('common.master_data'),
      },
      icon: <Database />,
      filledIcon: <DatabaseFill />,
    },
    {
      path: '/user-management',
      lazy: UserManagement,
      title: t('common.user_management'),
      handle: {
        crumb: () => t('common.user_management'),
      },
      icon: <ManageAccounts />,
      filledIcon: <ManageAccountsFill />,
    },
    {
      path: '/notification-manager',
      lazy: NotificationManager,
      title: t('common.notification_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.notificationmanager,
      handle: {
        crumb: () => t('common.notification_manager'),
      },
      icon: <NotificationSettings />,
      filledIcon: <NotificationSettingsFill />,
    },
    {
      path: '/theme-editor',
      lazy: () =>
        ThemeEditor({
          PreviewWebContent: themePreviewWebContent,
          hideStatusColors: themeHideStatusColors,
        }),
      title: t('common.theme_editor'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.themeeditor,
      handle: {
        crumb: () => t('common.theme_editor'),
      },
      icon: <Themeicon />,
      filledIcon: <ThemeiconFill />,
    },
    {
      path: '/license-manager',
      lazy: LicenseManager,
      title: t('common.license_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.licensemanager,
      handle: {
        crumb: () => t('common.license_manager'),
      },
      icon: <LicenseIcon />,
      filledIcon: <LicenseIconFill />,
    },
  ];

  additionalRoutes?.forEach((route) => {
    routes.splice(route.position, 0, {
      ...route,
    });
  });
  return routes;
};
