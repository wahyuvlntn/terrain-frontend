import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const CategoryEnum = z.enum([
  'FEEDBACK_RUNNING',
  'FEEDBACK_IDLE',
  'FEEDBACK_DOWN',
  'FEEDBACK_OFFLINE',
  'ALARM_WARNING',
  'ALARM_CRITICAL',
  'PARAMETER_WARNING',
  'PARAMETER_CRITICAL',
  'STATUS_RUNNING',
  'STATUS_IDLE',
  'STATUS_DOWN',
  'STATUS_PLANNED_DOWN',
  'STATUS_OFFLINE',
  'OEE_WARNING',
  'OEE_CRITICAL',
  'PRODUCTION_START',
  'PRODUCTION_PAUSED',
  'PRODUCTION_FINISHED',
  'PRODUCTION_RESUME',
  'SPC_OUT_OF_CONTROL',
  'SPC_OUT_OF_SPEC',
  'LICENSE_EXPIRY',
  'ACTIVE_ENERGY',
  'CARBON_EMISSION',
  'COST',
  'INSPECTION',
  'SPC_8_POINTS_ZONE_A',
  'SPC_7_POINTS_MONOTONIC',
  'SPC_14_POINTS_ALTERNATING',
  'SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND',
  'SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND',
  'SPC_15_POINTS_ZONE_C',
  'MAINTENANCE_ORDER_CREATED',
  'MAINTENANCE_ORDER_APPROVED',
  'MAINTENANCE_ORDER_REJECTED',
  'MAINTENANCE_ORDER_ASSIGNED',
  'MAINTENANCE_ORDER_STARTED',
  'MAINTENANCE_ORDER_PAUSED',
  'MAINTENANCE_ORDER_COMPLETED',
  'MAINTENANCE_ORDER_RESUMED',
  'MAINTENANCE_ORDER_CLOSED_REQUESTOR',
  'MAINTENANCE_ORDER_CLOSED_TECHNICIAN',
  'MAINTENANCE_ORDER_SCHEDULED',
  'RUNNING_HOUR_WARNING',
  'RUNNING_HOUR_CRITICAL'
]);

export const notificationSchema = z.object({
  id: z.number(),
  category: CategoryEnum,
  message: z.string(),
  messageHTML: z.string().nullable(),
  assetId: z.number().nullable(),
  /** equipment alias: the notification's item in the digital twin */
  assetAlias: z.string().nullish(),
  locationId: z.number().nullable(),
  parentId: z.number().nullable(),
  locationName: z.string().nullable(),
  timestamp: z.string(),
  additionalData: z.string().nullable(),
  isRead: z.boolean(),
  ancestors: z.array(z.number().nullable()),
  recipients : z.array(z.string()).optional(),
});

const getNotificationsSchema = z.object({
  isExtend: z.boolean(),
  notifications: z.array(notificationSchema),
});

export type GetNotifications = z.infer<typeof getNotificationsSchema>;
export type NotificationType = z.infer<typeof notificationSchema>;

/**
 * Window event with the notifications that just came in (`detail`: NotificationType[], oldest
 * first), for parts of the page that react to them (the assistant's avatar).
 */
export const NOTIFICATIONS_EVENT = 'afdd:notifications';

/** Where a notification leads in the digital twin: its equipment, else its location; null: neither */
export const notificationTwinUrl = (n: Pick<NotificationType, 'assetAlias' | 'locationId'>) =>
  n.assetAlias
    ? `/digital-twin?${new URLSearchParams({ asset: n.assetAlias })}`
    : typeof n.locationId === 'number'
      ? `/digital-twin?node=loc-${n.locationId}`
      : null;
export const getNotifications = async (
  from: string | null,
  to: string | null,
  search: string,
  page: number,
  limit: number,
  notifType: string
) => {
  const data = await jsRequest({
    url: `/notification/getnotifications`,
    data: {
      start_ts: from,
      end_ts: to,
      search,
      page,
      limit,
      notif_type: notifType,
    },
  });

  return getNotificationsSchema.parse({
    isExtend: data.is_extend,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notifications: data.notifications.map((item: any) => ({
      ...item,
      assetId: item.asset_id,
      assetAlias: item.asset_alias,
      locationId: item.location_id,
      parentId: item.parent_id,
      locationName: item.location_name,
      additionalData: item.additional_data,
      messageHTML: item.message_html,
      isRead: item.is_read,
    })),
  });
};

export type UpdateReadStatus = {
  id: number;
  isRead: boolean;
};

export const updateReadStatus = async (data: UpdateReadStatus) => {
  await jsRequest({
    url: `/notification/updatenotifreadstatus`,
    data: {
      notification_id: data.id,
      is_read: data.isRead,
    },
  });
};

//TODO: remove username since it's not used
export const getUnreadNotificationCounts = async (_username: string) => {
  const data = await jsRequest({
    url: `/notification/getunreadnotificationcounts`,
  });

  return z.number().parse(data);
};

//TODO: remove this since it's not used anywhere
// export const getLocationAncestor = async (
//   locationId: number | null
// ): Promise<number[] | null> => {
//   const data = await jsRequest({
//     url: `/location_overview/getlocationancestors`,
//     data: { location_id: locationId },
//   });
//
//   return z.array(z.number()).parse(data);
// };

export const readAllNotifications = async (username: string): Promise<void> => {
  return await jsRequest({
    url: `/notification/readallnotif`,
    data: { username },
  });
};
