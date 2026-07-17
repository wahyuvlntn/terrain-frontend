import {
  AnomalyCircleFill,
  CloseDownErrorCircle,
  CloseDownErrorCircleFill as CriticalIcon,
  CriticalAlertFill,
  LicenseIconFill,
  Maintenance,
  MaintenanceAction,
  MaintenanceApprove,
  MaintenanceClose,
  MaintenanceCreate,
  MaintenanceDone,
  MaintenanceReject,
  SuccessNormalCheckCircleFill as FeedbackRunningIcon,
  Time as TimeIcon,
  Uptime,
  WarningFill as WarningIcon,
} from '@digital-twin/icons';
import { formatDateHTMLInput, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { addDays } from 'date-fns';
import DOMPurify from 'dompurify';
import { useMotionValue } from 'framer-motion';
import { MutableRefObject, useContext, useEffect, useState } from 'react';
import { createSearchParams, Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { COLOR, extractFilterSearchParams, ThemeContext } from '../../..';
import utilStyles from '../../util-class.module.scss';
import { FILTER_KEY_ASSET, FILTER_KEY_LOCATION } from '../filter/filter.location';
import { CategoryEnum, notificationSchema } from './notification.api';
import styles from './notification-item.module.scss';

type NotificationItemProps = Omit<z.infer<typeof notificationSchema>, 'id'> & {
  notifType: 'all' | 'unread';
  onClick: (isRead: boolean) => void;
  onLinkClick: (isRead: boolean) => void;
  itemRef: MutableRefObject<HTMLDivElement | null> | null;
};

type Category = (typeof CategoryEnum.enum)[keyof typeof CategoryEnum.enum];

export const NotificationItem = ({
  message,
  messageHTML,
  category,
  isRead,
  ancestors,
  onClick,
  onLinkClick,
  timestamp,
  assetId,
  notifType,
  parentId,
  locationName,
  additionalData,
  itemRef,
}: NotificationItemProps) => {
  const [searchParams] = useSearchParams();
  const sanitizedHTML = DOMPurify.sanitize(messageHTML || message);
  const [readStatusChanged, setReadStatusChanged] = useState(false);
  const width = useMotionValue(readStatusChanged ? 442 : 0);
  const { colors } = useContext(ThemeContext);

  const categoryLabelMap: Record<Category, string> = {
    [CategoryEnum.enum.COST]: t('common.cost'),
    [CategoryEnum.enum.CARBON_EMISSION]: t('common.carbon_emission'),
    [CategoryEnum.enum.ACTIVE_ENERGY]: t('common.active_energy'),
    [CategoryEnum.enum.STATUS_RUNNING]: t('common.status_running'),
    [CategoryEnum.enum.INSPECTION]: t('common.inspection'),

    [CategoryEnum.enum.FEEDBACK_RUNNING]: t('common.feedback'),
    [CategoryEnum.enum.FEEDBACK_IDLE]: t('common.feedback'),
    [CategoryEnum.enum.FEEDBACK_DOWN]: t('common.feedback'),
    [CategoryEnum.enum.FEEDBACK_OFFLINE]: t('common.feedback'),

    [CategoryEnum.enum.ALARM_CRITICAL]: t('common.critical_alarm'),
    [CategoryEnum.enum.ALARM_WARNING]: t('common.warning_alarm'),

    [CategoryEnum.enum.PARAMETER_CRITICAL]: t('common.critical_parameter'),
    [CategoryEnum.enum.PARAMETER_WARNING]: t('common.warning_parameter'),

    [CategoryEnum.enum.STATUS_DOWN]: t('common.status_down'),
    [CategoryEnum.enum.STATUS_PLANNED_DOWN]: 'Planned Down',
    [CategoryEnum.enum.STATUS_OFFLINE]: t('common.status_offline'),
    [CategoryEnum.enum.STATUS_IDLE]: t('common.status_idle'),

    [CategoryEnum.enum.PRODUCTION_START]: t('common.production_start'),
    [CategoryEnum.enum.PRODUCTION_FINISHED]: t('common.production_finished'),
    [CategoryEnum.enum.PRODUCTION_PAUSED]: t('common.production_paused'),
    [CategoryEnum.enum.PRODUCTION_RESUME]: t('common.production_resume'),

    [CategoryEnum.enum.OEE_CRITICAL]: t('common.oee_critical'),
    [CategoryEnum.enum.OEE_WARNING]: t('common.oee_warning'),

    [CategoryEnum.enum.SPC_OUT_OF_CONTROL]: t('common.parameter_out_of_control'),
    [CategoryEnum.enum.SPC_OUT_OF_SPEC]: t('common.parameter_out_of_specification'),

    [CategoryEnum.enum.LICENSE_EXPIRY]: t('common.license_expiry'),

    [CategoryEnum.enum.MAINTENANCE_ORDER_CREATED]: t('common.maintenance_order_created'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_APPROVED]: t('common.maintenance_order_approved'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED]: t('common.maintenance_order_rejected'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_ASSIGNED]: t('common.maintenance_order_assigned'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_STARTED]: t('common.maintenance_order_started'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_PAUSED]: t('common.maintenance_order_paused'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_COMPLETED]: t('common.maintenance_order_completed'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_RESUMED]: t('common.maintenance_order_resumed'),
    [CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_REQUESTOR]: t(
      'common.maintenance_order_closed_requestor'
    ),
    [CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_TECHNICIAN]: t(
      'common.maintenance_order_closed_technician'
    ),
    [CategoryEnum.enum.MAINTENANCE_ORDER_SCHEDULED]: t('common.maintenance_order_scheduled'),

    [CategoryEnum.enum.RUNNING_HOUR_WARNING]: 'Running Hours Warning',
    [CategoryEnum.enum.RUNNING_HOUR_CRITICAL]: 'Running Hours Critical',

    [CategoryEnum.enum.SPC_8_POINTS_ZONE_A]: 'SPC-8-POINTS-ZONE-A',
    [CategoryEnum.enum.SPC_7_POINTS_MONOTONIC]: 'SPC-7-POINTS-MONOTONIC',
    [CategoryEnum.enum.SPC_14_POINTS_ALTERNATING]: 'SPC-14-POINTS-ALTERNATING',
    [CategoryEnum.enum.SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND]:
      'SPC-2-OUT-OF-3-POINTS-ZONE-A-OR-BEYOND',
    [CategoryEnum.enum.SPC_15_POINTS_ZONE_C]: 'SPC-15-POINTS-ZONE-C',
    [CategoryEnum.enum.SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND]:
      'SPC-4-OUT-OF-5-POINTS-ZONE-B-OR-BEYOND',
  };

  useEffect(() => {
    if (readStatusChanged && notifType === 'all') {
      width.set(442);
    } else {
      width.set(0);
    }
  }, [width, readStatusChanged, notifType]);

  const handleClick = () => {
    setReadStatusChanged(true);
    onClick(isRead);
    setTimeout(() => setReadStatusChanged(false), 1000);
  };

  function getUrlForCategory() {
    if (
      category === CategoryEnum.enum.PARAMETER_CRITICAL ||
      category === CategoryEnum.enum.PARAMETER_WARNING ||
      category === CategoryEnum.enum.STATUS_DOWN ||
      category === CategoryEnum.enum.STATUS_OFFLINE ||
      category === CategoryEnum.enum.STATUS_RUNNING ||
      category === CategoryEnum.enum.STATUS_IDLE ||
      category === CategoryEnum.enum.SPC_OUT_OF_CONTROL ||
      category === CategoryEnum.enum.SPC_OUT_OF_SPEC ||
      category === CategoryEnum.enum.SPC_14_POINTS_ALTERNATING ||
      category === CategoryEnum.enum.SPC_15_POINTS_ZONE_C ||
      category === CategoryEnum.enum.SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND ||
      category === CategoryEnum.enum.SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND ||
      category === CategoryEnum.enum.SPC_7_POINTS_MONOTONIC ||
      category === CategoryEnum.enum.SPC_8_POINTS_ZONE_A
    ) {
      return `/asset-overview/${assetId}`;
    } else if (
      category === CategoryEnum.enum.ALARM_CRITICAL ||
      category === CategoryEnum.enum.ALARM_WARNING
    ) {
      return '/alarm-report';
    } else if (
      category === CategoryEnum.enum.PRODUCTION_START ||
      category === CategoryEnum.enum.PRODUCTION_RESUME ||
      category === CategoryEnum.enum.PRODUCTION_PAUSED ||
      category === CategoryEnum.enum.PRODUCTION_FINISHED
    ) {
      return '/production-tracker';
    } else if (
      category === CategoryEnum.enum.FEEDBACK_DOWN ||
      category === CategoryEnum.enum.FEEDBACK_IDLE ||
      category === CategoryEnum.enum.FEEDBACK_OFFLINE ||
      category === CategoryEnum.enum.FEEDBACK_RUNNING
    ) {
      return '/operator-feedback';
    } else if (
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CREATED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_APPROVED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_ASSIGNED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_STARTED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_PAUSED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_COMPLETED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_RESUMED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_REQUESTOR ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_TECHNICIAN ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_SCHEDULED
    ) {
      return '/maintenance-order';
    } else if (category === CategoryEnum.enum.LICENSE_EXPIRY) {
      return '/license-manager';
    } else if (category === CategoryEnum.enum.INSPECTION) {
      return '/inspection-report';
    } else {
      return '/location-overview';
    }
  }

  function getQueryParamsForCategory(): string {
    if (
      category === CategoryEnum.enum.PRODUCTION_START ||
      category === CategoryEnum.enum.PRODUCTION_RESUME ||
      category === CategoryEnum.enum.PRODUCTION_FINISHED ||
      category === CategoryEnum.enum.PRODUCTION_PAUSED
    ) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        selectedInputId: additionalData ? JSON.parse(additionalData).id || '' : '',
        start: formatDateHTMLInput(new Date(timestamp)),
        end: formatDateHTMLInput(addDays(new Date(timestamp), 1)),
      })}`;
    } else if (
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CREATED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_APPROVED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_ASSIGNED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_STARTED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_PAUSED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_COMPLETED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_RESUMED ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_REQUESTOR ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_TECHNICIAN ||
      category === CategoryEnum.enum.MAINTENANCE_ORDER_SCHEDULED
    ) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        selected: additionalData ? JSON.parse(additionalData).id || '' : '',
        view: 'list',
        page: '1',
        tab: additionalData ? JSON.parse(additionalData).tab || '' : '',
        add: 'false',
        start: additionalData
          ? formatDateHTMLInput(new Date(JSON.parse(additionalData).planned_start)) || ''
          : '',
        end: additionalData
          ? formatDateHTMLInput(new Date(JSON.parse(additionalData).planned_start)) || ''
          : '',
      })}`;
    } else if (
      category === CategoryEnum.enum.SPC_OUT_OF_SPEC ||
      category === CategoryEnum.enum.SPC_OUT_OF_CONTROL ||
      category === CategoryEnum.enum.SPC_14_POINTS_ALTERNATING ||
      category === CategoryEnum.enum.SPC_15_POINTS_ZONE_C ||
      category === CategoryEnum.enum.SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND ||
      category === CategoryEnum.enum.SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND ||
      category === CategoryEnum.enum.SPC_7_POINTS_MONOTONIC ||
      category === CategoryEnum.enum.SPC_8_POINTS_ZONE_A
    ) {
      return `?${createSearchParams({
        'show-spc-list': 'true',
        'parameter-search': JSON.parse(additionalData ?? '{}')?.parameter_name ?? '',
        'spc-page': '1',
      })}`;
    } else if (
      category === CategoryEnum.enum.OEE_WARNING ||
      category === CategoryEnum.enum.OEE_CRITICAL ||
      category === CategoryEnum.enum.ACTIVE_ENERGY ||
      category === CategoryEnum.enum.COST ||
      category === CategoryEnum.enum.CARBON_EMISSION
    ) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        start: formatDateHTMLInput(new Date(timestamp)),
        end: formatDateHTMLInput(addDays(new Date(timestamp), 1)),
        location_id: parentId?.toString() ?? '',
        search: locationName ?? '',
        locations: JSON.stringify(ancestors.map((item) => item?.toString())),
      })}`;
    } else if (
      category === CategoryEnum.enum.FEEDBACK_DOWN ||
      category === CategoryEnum.enum.FEEDBACK_IDLE ||
      category === CategoryEnum.enum.FEEDBACK_OFFLINE ||
      category === CategoryEnum.enum.FEEDBACK_RUNNING
    ) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        start: formatDateHTMLInput(new Date(timestamp)),
        end: formatDateHTMLInput(addDays(new Date(timestamp), 1)),
        [`no-${FILTER_KEY_LOCATION}-filter`]: 'true',
        [FILTER_KEY_ASSET]: assetId?.toString() ?? '',
        sidebar: 'open',
        feedback_id: additionalData ? JSON.parse(additionalData).feedback_id || '' : '',
      })}`;
    } else if (
      category === CategoryEnum.enum.PARAMETER_CRITICAL ||
      category === CategoryEnum.enum.PARAMETER_WARNING ||
      category === CategoryEnum.enum.STATUS_DOWN ||
      category === CategoryEnum.enum.STATUS_OFFLINE
    ) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        date: formatDateHTMLInput(new Date(timestamp)),
      })}`;
    } else if (category === CategoryEnum.enum.LICENSE_EXPIRY) {
      return '';
    } else if (category === CategoryEnum.enum.INSPECTION) {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        start: formatDateHTMLInput(new Date(timestamp)),
        end: formatDateHTMLInput(addDays(new Date(timestamp), 1)),
        selected: JSON.parse(additionalData!)?.selected,
        sidebar: 'open',
      })}`;
    } else {
      return `?${createSearchParams({
        ...extractFilterSearchParams(searchParams),
        start: formatDateHTMLInput(new Date(timestamp)),
        end: formatDateHTMLInput(addDays(new Date(timestamp), 1)),
      })}`;
    }
  }

  return (
    <div
      ref={itemRef}
      className={clsx(styles['notification-item'], isRead && styles['is-read'], {
        [styles.running]:
          category === CategoryEnum.enum.FEEDBACK_RUNNING ||
          category === CategoryEnum.enum.STATUS_RUNNING ||
          category === CategoryEnum.enum.PRODUCTION_START ||
          category === CategoryEnum.enum.PRODUCTION_RESUME ||
          category === CategoryEnum.enum.PRODUCTION_FINISHED,
        [styles.idle]:
          category === CategoryEnum.enum.FEEDBACK_IDLE ||
          category === CategoryEnum.enum.STATUS_IDLE ||
          category === CategoryEnum.enum.PRODUCTION_PAUSED ||
          category === CategoryEnum.enum.INSPECTION,
        [styles.down]:
          category === CategoryEnum.enum.FEEDBACK_DOWN ||
          category === CategoryEnum.enum.STATUS_DOWN ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED,
        [styles.planned_down]: category === CategoryEnum.enum.STATUS_PLANNED_DOWN,
        [styles.offline]:
          category === CategoryEnum.enum.FEEDBACK_OFFLINE ||
          category === CategoryEnum.enum.STATUS_OFFLINE,
        [styles.critical]:
          category === CategoryEnum.enum.ALARM_CRITICAL ||
          category === CategoryEnum.enum.PARAMETER_CRITICAL ||
          category === CategoryEnum.enum.OEE_CRITICAL ||
          category === CategoryEnum.enum.SPC_OUT_OF_SPEC ||
          category === CategoryEnum.enum.SPC_14_POINTS_ALTERNATING ||
          category === CategoryEnum.enum.SPC_15_POINTS_ZONE_C ||
          category === CategoryEnum.enum.SPC_2_OUT_OF_3_POINTS_ZONE_A_OR_BEYOND ||
          category === CategoryEnum.enum.SPC_4_OUT_OF_5_POINTS_ZONE_B_OR_BEYOND ||
          category === CategoryEnum.enum.SPC_7_POINTS_MONOTONIC ||
          category === CategoryEnum.enum.SPC_8_POINTS_ZONE_A ||
          category === CategoryEnum.enum.RUNNING_HOUR_CRITICAL,
        [styles.warning]:
          category === CategoryEnum.enum.ALARM_WARNING ||
          category === CategoryEnum.enum.SPC_OUT_OF_CONTROL ||
          category === CategoryEnum.enum.PARAMETER_WARNING ||
          category === CategoryEnum.enum.OEE_WARNING ||
          category === CategoryEnum.enum.LICENSE_EXPIRY ||
          category === CategoryEnum.enum.ACTIVE_ENERGY ||
          category === CategoryEnum.enum.CARBON_EMISSION ||
          category === CategoryEnum.enum.COST ||
          category === CategoryEnum.enum.RUNNING_HOUR_WARNING,
        [styles.maintenance_approve]:
          category === CategoryEnum.enum.MAINTENANCE_ORDER_APPROVED ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_ASSIGNED ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_SCHEDULED,
        [styles.maintenance_action]:
          category === CategoryEnum.enum.MAINTENANCE_ORDER_STARTED ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_PAUSED ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_RESUMED,
        [styles.maintenance_reject]: category === CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED,
        [styles.maintenance_complete]: category === CategoryEnum.enum.MAINTENANCE_ORDER_COMPLETED,
        [styles.maintenance_close]:
          category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_REQUESTOR ||
          category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_TECHNICIAN,
        [styles.maintenance_create]: category === CategoryEnum.enum.MAINTENANCE_ORDER_CREATED,
      })}
    >
      <div className={styles.clickable} onClick={handleClick}>
        {!isRead ? (
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="4"
              cy="4"
              r="3.5"
              fill={COLOR.conditionCriticalSecondary}
              stroke={COLOR.conditionCriticalPrimary}
            />
          </svg>
        ) : null}
      </div>
      {/* <motion.div
        layout
        className={styles['read-status']}
        style={{
          width: widthTransformed,
          minWidth: widthTransformed,
          height: '100%',
        }}
      >
        <div className={styles.container}>
          {isRead ? <MailOpenFill /> : <MailFill />}
          <span>{isRead ? 'Read' : 'Unread'}</span>
        </div>
      </motion.div> */}
      <Link
        onClick={() => onLinkClick(isRead)}
        to={{
          pathname: getUrlForCategory(),
          search: getQueryParamsForCategory(),
        }}
        className={styles.content}
      >
        <div className={styles.header}>
          <div className={styles.title}>
            {category === CategoryEnum.enum.FEEDBACK_RUNNING ? (
              <FeedbackRunningIcon />
            ) : category === CategoryEnum.enum.FEEDBACK_DOWN ||
              category === CategoryEnum.enum.OEE_CRITICAL ? (
              <CriticalIcon />
            ) : category === CategoryEnum.enum.ALARM_CRITICAL ||
              category === CategoryEnum.enum.PARAMETER_CRITICAL ? (
              <CriticalAlertFill />
            ) : category === CategoryEnum.enum.PARAMETER_WARNING ||
              category === CategoryEnum.enum.ALARM_WARNING ||
              category === CategoryEnum.enum.OEE_WARNING ? (
              <WarningIcon />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_CREATED ? (
              <MaintenanceCreate />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_STARTED ||
              category === CategoryEnum.enum.MAINTENANCE_ORDER_PAUSED ||
              category === CategoryEnum.enum.MAINTENANCE_ORDER_RESUMED ? (
              <MaintenanceAction />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_COMPLETED ? (
              <MaintenanceDone />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_REQUESTOR ||
              category === CategoryEnum.enum.MAINTENANCE_ORDER_CLOSED_TECHNICIAN ? (
              <MaintenanceClose />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_REJECTED ? (
              <MaintenanceReject />
            ) : category === CategoryEnum.enum.MAINTENANCE_ORDER_APPROVED ||
              category === CategoryEnum.enum.MAINTENANCE_ORDER_ASSIGNED ||
              category === CategoryEnum.enum.MAINTENANCE_ORDER_SCHEDULED ? (
              <MaintenanceApprove />
            ) : category === CategoryEnum.enum.STATUS_RUNNING ? (
              <Uptime />
            ) : category === CategoryEnum.enum.STATUS_PLANNED_DOWN ? (
              <Maintenance />
            ) : category === CategoryEnum.enum.STATUS_DOWN ||
              category === CategoryEnum.enum.STATUS_OFFLINE ? (
              <CloseDownErrorCircle />
            ) : category === CategoryEnum.enum.SPC_OUT_OF_CONTROL ? (
              <AnomalyCircleFill color={colors.conditionWarningPrimary} />
            ) : category === CategoryEnum.enum.SPC_OUT_OF_SPEC ? (
              <AnomalyCircleFill color={colors.conditionCriticalPrimary} />
            ) : category === CategoryEnum.enum.RUNNING_HOUR_WARNING ? (
              <TimeIcon color={colors.conditionWarningPrimary} />
            ) : category === CategoryEnum.enum.RUNNING_HOUR_CRITICAL ? (
              <TimeIcon color={colors.conditionCriticalPrimary} />
            ) : category === CategoryEnum.enum.LICENSE_EXPIRY ? (
              <LicenseIconFill color={colors.conditionCriticalPrimary} />
            ) : null}
            <h4>{categoryLabelMap[category as Category] ?? 'Unregistered notification'}</h4>
          </div>
          <span className={styles.timelabel}>{`${new Date(timestamp)
            .getHours()
            .toString()
            .padStart(2, '0')}:${new Date(timestamp)
            .getMinutes()
            .toString()
            .padStart(2, '0')}`}</span>
        </div>
        <div className={clsx(styles.message, utilStyles['body-ideal-normal_body_text'])}>
          <div className={styles.vr} style={{ flexShrink: 0 }}></div>
          <span dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
        </div>
      </Link>
    </div>
  );
};
