import { t } from '@digital-twin/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getUserPermission } from '../api/user';
import { addUserGroupPermission, getUserGroupPermission } from '../api/user-group';

interface Permissions {
  [key: string]: boolean;
}

// Mendefinisikan tipe untuk objek permissions secara keseluruhan
// Ini menggunakan Union Types untuk menangani berbagai bentuk permissions
type PermissionsObject = {
  [key: string]: Permissions;
};

// Mendefinisikan tipe untuk struktur array target
interface PermissionArrayItem {
  permission_group_alias: string;
  permission_alias: string;
  value: boolean;
}

interface AliasToNameMapping {
  [key: string]: string;
}

export const useScreenAccess = (type: string, param: string | null) => {
  const [permissions, setPermissions] = useState<PermissionsObject>({
    locationoverview: {
      read: false,
      update: false,
    },
    equipmentoverview: {
      read: false,
      update: false,
      create: false,
      delete: false,
    },
    alarmsreport: {
      read: false,
      update: false,
    },
    // downtimeanalysis: {
    //   read: false,
    //   update: false,
    // },
    // reliabilityanalysis: {
    //   read: false,
    //   update: false,
    // },
    // productionperformance: {
    //   read: false,
    //   update: false,
    // },
    // feedbackssubmission: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    // productiontracker: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    maintenanceorder: {
      read: false,
      update: false,
      create: false,
      delete: false,
      approve: false,
      report: false,
    },
    maintenanceperformance: {
      read: false,
    },
    maintenanceinstruction: {
      read: false,
      update: false,
      create: false,
      delete: false,
    },
    personnelmanagement: {
      read: false,
      update: false,
    },
    // locationmanager: {
    //   read: false,
    //   update: false,
    // },
    // datasourcemanager: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    // modelmanager: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    // equipmentmanager: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    // masterdata: {
    //   read: false,
    //   update: false,
    // },
    // licensemanager: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    themeeditor: {
      read: false,
      update: false,
      create: false,
      delete: false,
    },
    earlywarningdiagnostics: {
      read: false,
      update: false,
    },
    // alarmmapping: {
    //   read: false,
    //   update: false,
    // },
    // issuemapping: {
    //   read: false,
    //   update: false,
    //   create: false,
    //   delete: false,
    // },
    earlywarningdashboard: {
      read: false,
    },
    // update = operate the plant from the digital twin (write set points and modes)
    digitaltwin: {
      read: false,
      update: false,
    },
    // AI assistant chat; AI insights (update = documents, optimizer runs, recommendations);
    // simulation jobs (create = submit and approve digital twin simulations)
    aiassistant: {
      read: false,
    },
    aiinsights: {
      read: false,
      update: false,
    },
    simulation: {
      read: false,
      create: false,
    },
    // production monitoring of the FAB1 module (read only)
    production: {
      read: false,
    },
  });

  const userGroupPermissionQuery = useQuery({
    queryKey: [
      'getUserGroupPermission',
      {
        type,
        param,
      },
    ],
    queryFn: () =>
      getUserGroupPermission({
        alias: param || '',
      }),
    enabled: type === 'USER_GROUP' && param !== null,
  });

  // console.log(userGroupPermissionQuery.data);

  useEffect(() => {
    if (userGroupPermissionQuery.data) {
      const newData = userGroupPermissionQuery.data.reduce((acc, curr) => {
        const { permission_group_alias, permission_alias, value } = curr;

        if (!acc[permission_group_alias]) {
          acc[permission_group_alias] = {};
        }

        acc[permission_group_alias][permission_alias] = value;

        return acc;
      }, {} as PermissionsObject);

      // Set permissions dengan data yang baru
      setPermissions((prevPermissions) => ({
        ...prevPermissions,
        ...newData,
      }));
    }
  }, [userGroupPermissionQuery.data]);

  const userPermissionQuery = useQuery({
    queryKey: [
      'getUserPermission',
      {
        type,
        param,
      },
    ],
    queryFn: () => getUserPermission({ username: param || '' }),
    enabled: type === 'USER' && param !== null,
  });

  useEffect(() => {
    if (userPermissionQuery.data) {
      const newData = userPermissionQuery.data.reduce((acc, curr) => {
        const { permission_group_alias, permission_alias, value } = curr;

        if (!acc[permission_group_alias]) {
          acc[permission_group_alias] = {};
        }

        acc[permission_group_alias][permission_alias] = value;

        return acc;
      }, {} as PermissionsObject);

      setPermissions((prevPermissions) => ({
        ...prevPermissions,
        ...newData,
      }));
    }
  }, [userPermissionQuery.data]);

  const aliasToNameMapping: AliasToNameMapping = {
    locationoverview: t('common.location_overview'),
    equipmentoverview: t('common.equipment_overview'),
    alarmsreport: t('common.alarm_report'),
    downtimeanalysis: t('common.downtime_analysis'),
    reliabilityanalysis: t('common.reliability_analysis'),
    productionperformance: t('common.production_performance'),
    // feedbackssubmission: t('common.feedback_submission'),
    // productiontracker: t('common.production_tracker'),
    // locationmanager: t('common.location_manager'),
    // datasourcemanager: t('common.data_source_manager'),
    // modelmanager: t('common.model_manager'),
    // equipmentmanager: t('common.equipment_manager'),
    // masterdata: t('common.master_data'),
    // licensemanager: t('common.license_manager'),
    themeeditor: t('common.theme_editor'),
    // notificationmanager: t('common.notification_manager'),
    maintenanceorder: t('common.maintenance_order'),
    maintenanceperformance: t('common.maintenance_performance'),
    maintenanceinstruction: t('common.maintenance_instruction'),
    personnelmanagement: t('common.personnel_management'),
    earlywarningdashboard: 'Early Warning Dashboard',
    earlywarningdiagnostics: 'Early Warning & Diagnostics',
    digitaltwin: 'Digital Twin',
    aiassistant: 'AI Assistant',
    aiinsights: 'AI Insights',
    simulation: 'Simulation',
    production: 'Production',
    // alarmmapping: 'Alarm Mapping',
    // issuemapping: 'Issue Mapping',
  };

  const convertPermissionsToArray = (permissions: PermissionsObject): PermissionArrayItem[] => {
    return Object.keys(permissions).flatMap((permissionGroupAlias) =>
      Object.keys(permissions[permissionGroupAlias]).map((permissionAlias) => ({
        permission_group_alias: permissionGroupAlias,
        permission_alias: permissionAlias,
        value: permissions[permissionGroupAlias][permissionAlias as keyof Permissions],
      }))
    );
  };

  // console.log(permissions);

  const { mutate } = useMutation({
    mutationFn: addUserGroupPermission,
    meta: {
      toastId: 'addUserGroupPermission',
    },
  });

  const permissionsArray: PermissionArrayItem[] = convertPermissionsToArray(permissions);

  const handleSubmit = () => {
    if (param) {
      mutate({ alias: param, permissions: JSON.stringify(permissionsArray) });
    }
  };

  const updatePermission = (group: string, perm: string) => {
    setPermissions((prev) => ({
      ...prev,
      [group]: { ...prev[group], [perm]: !prev[group][perm] },
    }));
  };

  return {
    permissions,
    updatePermission,
    handleSubmit,
    aliasToNameMapping,
  };
};
