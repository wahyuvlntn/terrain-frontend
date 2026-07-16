import { jsRequest, request } from '@digital-twin/utils';
import { AxiosError } from 'axios';
import { z } from 'zod';

export const credentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const signin = async (credentials: Credentials) => {
  try {
    const data = await request({
      url: '/api/user-management/exposed/get-session-add-expiry',
      data: {
        username: credentials.username,
        password: credentials.password,
      },
    });

    return z.string().parse(data.session_id);
  } catch (e) {
    if (e instanceof AxiosError) {
      if (e.code !== 'ERR_NETWORK') {
        throw e;
      }
    } else {
      throw e;
    }
  }
};

export const PermissionAliasEnum = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'report',
]);
export type TPermissionAliasEnum = z.infer<typeof PermissionAliasEnum>;

export const PermissionGroupAliasEnum = z.enum([
  'locationoverview',
  'equipmentoverview',
  'alarmsreport',
  'downtimeanalysis',
  'reliabilityanalysis',
  'productionperformance',
  'feedbackssubmission',
  'productiontracker',
  'locationmanager',
  'datasourcemanager',
  'modelmanager',
  'equipmentmanager',
  'masterdata',
  'licensemanager',
  'themeeditor',
  'inspectionreport',
  'energyflow',
  'carboncost',
  'sldconfiguration',
  'carbonemission',
  'energyanalysis',
  'energycost',
  'energydistribution',
  'energyoverview',
  'parameteranalysis',
  'sldthresholdsetup',
  'notificationmanager',
  'maintenanceorder',
  'maintenanceperformance',
  'maintenanceinstruction',
  'personnelmanagement',
  'earlywarningdashboard',
  'earlywarningdiagnostics',
  'issuemapping',
  'alarmmapping',
  'digitaltwin',
  'aiassistant',
  'aiinsights',
  'simulation',
  'production',
]);
export type TPermissionGroupAliasEnum = z.infer<typeof PermissionGroupAliasEnum>;

const userDataSchema = z.object({
  /** the user's id and username (sent by the backend since 2026-10-10; absent from older backends) */
  id: z.number().nullable().optional(),
  username: z.string().nullable().optional(),
  fullName: z.string(),
  employeeId: z.string().nullable(),
  photo: z.string(),
  role: z.union([z.literal('basic'), z.literal('admin'), z.literal('superuser')]),
  assignedLocations: z.array(z.number().nullable()),
  permissions: z.array(
    z.object({
      alias: PermissionAliasEnum,
      groupAlias: PermissionGroupAliasEnum,
    })
  ),
});

export type UserData = z.infer<typeof userDataSchema>;

export const getUserData = async () => {
  const data = await jsRequest({
    url: `/user/getuserdetails`,
  });
  return userDataSchema.parse({
    id: typeof data.id === 'number' ? data.id : null,
    username: typeof data.username === 'string' ? data.username : null,
    fullName: data.full_name,
    employeeId: data.employee_id,
    photo: data.photo,
    role: data.role,
    assignedLocations: data.assignedLocations,
    permissions: data.permissions.map((item: { group_alias: unknown }) => ({
      ...item,
      groupAlias: item.group_alias,
    })),
  });
};
