import { t, useLanguageSwitcher } from '@digital-twin/utils';
import {
  TabProduct as Tab,
  TabsProduct as Tabs,
} from '@digital-twin/reusables';
import clsx from 'clsx';
import { ReactNode, useContext } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  withAuth,
} from '../../auth';
import styles from './connection-manager.module.scss';
import { EquipmentManagerProps } from './equipment-manager';

const LocationManager = async () => ({
  Component: withAuth(
    (await import('./location-manager')).LocationManager,
    PermissionGroupAliasEnum.enum.locationmanager
  ),
});

const GatewayManager = async () => ({
  Component: withAuth(
    (await import('./gateway-manager')).GatewayManager,
    PermissionGroupAliasEnum.enum.datasourcemanager
  ),
});

const ModelManager = async () => ({
  Component: withAuth(
    (await import('./model-manager')).ModelManager,
    PermissionGroupAliasEnum.enum.modelmanager
  ),
});

const EquipmentManager = (props: EquipmentManagerProps) => {
  return import('./equipment-manager').then((module) => ({
    Component: withAuth(
      () => <module.EquipmentManager {...props} />,
      PermissionGroupAliasEnum.enum.equipmentmanager
    ),
  }));
};

const IssueMapping = async () => ({
  Component: withAuth(
    (await import('./issue-mapping')).IssueMapping,
    //TODO: change permission
    PermissionGroupAliasEnum.enum.modelmanager
  ),
});

const AlarmMapping = async () => ({
  Component: withAuth(
    (await import('./alarm-mapping')).AlarmMapping,
    //TODO: change permission
    PermissionGroupAliasEnum.enum.modelmanager
  ),
});

type TGetRouseParams = {
  equipmentManagerFilterTypeTree: ReactNode;
  equipmentManagerFilterTypeShortcut: ReactNode;
  equipmentManagerFilterTypeKey: string;
};

export const getRoutes = ({
  equipmentManagerFilterTypeKey,
  equipmentManagerFilterTypeShortcut,
  equipmentManagerFilterTypeTree,
}: TGetRouseParams) => {
  const routes = [
    {
      path: 'location-manager',
      lazy: LocationManager,
      title: t('common.location_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.locationmanager,
    },
    {
      path: 'data-source-manager',
      lazy: GatewayManager,
      title: t('common.data_source_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.datasourcemanager,
    },
    {
      path: 'model-manager',
      lazy: ModelManager,
      title: t('common.model_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.modelmanager,
    },
    {
      path: 'equipment-manager',
      lazy: () =>
        EquipmentManager({
          filterTypeKey: equipmentManagerFilterTypeKey,
          filterTypeShortcut: equipmentManagerFilterTypeShortcut,
          filterTypeTree: equipmentManagerFilterTypeTree,
        }),
      title: t('common.equipment_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.equipmentmanager,
    },
    {
      path: 'issue-mapping',
      lazy: IssueMapping,
      title: 'Issue Mapping',
      permissionGroupAlias: PermissionGroupAliasEnum.enum.issuemapping,
    },
    {
      path: 'alarm-mapping',
      lazy: AlarmMapping,
      title: 'Alarm Mapping',
      permissionGroupAlias: PermissionGroupAliasEnum.enum.alarmmapping,
    }
  ];
  return routes;
};

type TabGroupContainerProps = {
  routes: {
    path: string;
    title: string;
  }[];
  type: 'connection-manager' | 'electricity-configuration' | 'carbon-cost';
};

export const TabGroupContainer = ({ routes, type }: TabGroupContainerProps) => {
  const { pathname } = useLocation();
  let prefixUrlRemoved: string = '';

  if (type === 'connection-manager') {
    prefixUrlRemoved = pathname.replace('/connection-manager/', '');
  } else if (type === 'electricity-configuration') {
    prefixUrlRemoved = pathname
      .replace('/electricity-configuration/', '')
      .split('/')[0];
  } else {
    prefixUrlRemoved = pathname
      .replace('/electricity-configuration/', '')
      .split('/')[1];
  }

  // Check if first tab is selected
  let isFirstTabSelected = false;
  if (routes.length > 0) {
    isFirstTabSelected = prefixUrlRemoved === routes[0].path;
  }

  return (
    <div className={styles['connection-manager']}>
      <Tabs
        value={prefixUrlRemoved}
        onChange={() => { return }}
        type="2"
        className={styles['tabs']}
      >
        {routes.map((route) => (
          <Tab
            key={route.path}
            value={route.path}
            style={{ fontSize: 22, fontWeight: 600 }}
          >
            <Link to={route.path}>{route.title}</Link>
          </Tab>
        ))}
      </Tabs>
      <div
        className={clsx(
          styles['content'],
          isFirstTabSelected && styles['content--first-tab-selected']
        )}
      >
        <Outlet />
      </div>
    </div>
  );
};

export const ConnectionManager = () => {
  useLanguageSwitcher();

  const { hasPermission } = useContext(AuthCtx);

  const routes = [
    {
      path: 'location-manager',
      title: t('common.location_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.locationmanager,
    },
    {
      path: 'data-source-manager',
      title: t('common.data_source_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.datasourcemanager,
    },
    {
      path: 'model-manager',
      title: t('common.model_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.modelmanager,
    },
    {
      path: 'equipment-manager',
      title: t('common.equipment_manager'),
      permissionGroupAlias: PermissionGroupAliasEnum.enum.equipmentmanager,
    },
    {
      path: 'issue-mapping',
      title: 'Issue Mapping',
      permissionGroupAlias: PermissionGroupAliasEnum.enum.issuemapping,
    },
    {
      path: 'alarm-mapping',
      title: 'Alarm Mapping',
      permissionGroupAlias: PermissionGroupAliasEnum.enum.alarmmapping,
    },
  ];

  return (
    <TabGroupContainer
      routes={routes.filter((item) =>
        hasPermission(item.permissionGroupAlias, PermissionAliasEnum.enum.read)
      )}
      type="connection-manager"
    />
  );
};
