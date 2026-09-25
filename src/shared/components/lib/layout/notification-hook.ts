import {
  APP_NAME,
  formatDateHTMLInput,
  getLocalDateMidnight,
  translateMessageWithPredefinedKeys,
} from '@digital-twin/utils';
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import mqtt from 'mqtt';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import NotifSound from '../../../assets/lib/audio/notif.mp3';
import appIcon from '../../../assets/lib/image/app-icon.svg';
import { AuthCtx } from '../feat';
import {
  FILTER_KEY_ASSET,
  FILTER_KEY_LOCATION,
} from '../feat/filter/filter.location';
import {
  GetNotifications,
  getNotifications,
  getUnreadNotificationCounts,
  NotificationType,
  readAllNotifications,
  UpdateReadStatus,
  updateReadStatus,
} from '../feat/notification/notification.api';

/** how often the newest notifications are fetched without a broker */
const NOTIFY_POLL_MS = 15_000;

const playNotificationSound = () => {
  const audio = new Audio(NotifSound);
  audio.autoplay = true;
  return audio.play();
};

export const getMidnightDate = (ts: string) => {
  const dt = new Date(ts);

  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

const registerServiceWorker = () => {
  return navigator.serviceWorker.register('/sw.js');
};

export const useNotification = (enabled: boolean) => {
  const [incomingNotifications, setIncomingNotifications] = useState<
    NotificationType[]
  >([]);

  const [incomingNotifCount, setIncomingNotifCount] = useState(0);
  const [notifType, setNotifType] = useState<'all' | 'unread'>('all');
  const { userData, username } = useContext(AuthCtx);

  //TODO: Don't hardcode the mapping here, fetch from backend instead
  const PERMISSION_TO_CATEGORIES: Record<
    string,
    { id: number; name: string }[]
  > = useMemo(() => {
    return {
      feedbackssubmission: [
        { id: 1, name: 'FEEDBACK_RUNNING' },
        { id: 2, name: 'FEEDBACK_IDLE' },
        { id: 3, name: 'FEEDBACK_DOWN' },
        { id: 4, name: 'FEEDBACK_OFFLINE' },
      ],
      alarmsreport: [
        { id: 5, name: 'ALARM_WARNING' },
        { id: 6, name: 'ALARM_CRITICAL' },
      ],
      equipmentoverview: [
        { id: 7, name: 'PARAMETER_WARNING' },
        { id: 8, name: 'PARAMETER_CRITICAL' },
        { id: 9, name: 'STATUS_RUNNING' },
        { id: 10, name: 'STATUS_IDLE' },
        { id: 11, name: 'STATUS_DOWN' },
        { id: 12, name: 'STATUS_OFFLINE' },
        { id: 15, name: 'SPC_OUT_OF_CONTROL' },
        { id: 16, name: 'SPC_OUT_OF_SPEC' },
      ],
      locationoverview: [
        { id: 13, name: 'OEE_WARNING' },
        { id: 14, name: 'OEE_CRITICAL' },
      ],
      licensemanager: [{ id: 17, name: 'LICENSE_EXPIRY' }],
      productiontracker: [
        { id: 18, name: 'PRODUCTION_START' },
        { id: 19, name: 'PRODUCTION_PAUSED' },
        { id: 20, name: 'PRODUCTION_FINISHED' },
        { id: 21, name: 'PRODUCTION_RESUME' },
      ],
      energyoverview: [],
      inspectionreport: [],
      maintenanceorder: [
        { id: 22, name: 'MAINTENANCE_ORDER_CREATED' },
        { id: 23, name: 'MAINTENANCE_ORDER_APPROVED' },
        { id: 24, name: 'MAINTENANCE_ORDER_REJECTED' },
        { id: 25, name: 'MAINTENANCE_ORDER_ASSIGNED' },
        { id: 26, name: 'MAINTENANCE_ORDER_STARTED' },
        { id: 27, name: 'MAINTENANCE_ORDER_PAUSED' },
        { id: 28, name: 'MAINTENANCE_ORDER_COMPLETED' },
        { id: 29, name: 'MAINTENANCE_ORDER_RESUMED' },
        { id: 30, name: 'MAINTENANCE_ORDER_CLOSED_REQUESTOR' },
        { id: 31, name: 'MAINTENANCE_ORDER_CLOSED_TECHNICIAN' },
        { id: 32, name: 'MAINTENANCE_ORDER_SCHEDULED' },
      ],
    };
  }, []);

  const parseAndFilterMessages = useCallback(
    (
      message: Buffer,
      assignedLocations: (number | null)[],
      assignedCategories: string[] | undefined,
      isSuperUser: boolean
    ): NotificationType[] => {
      if (isSuperUser) {
        const superUserNotifications = JSON.parse(message.toString()).map(
          (notification: NotificationType) => ({
            ...notification,
            additionalData: JSON.stringify(notification.additionalData),
            isRead: false,
          })
        );
        return superUserNotifications;
      }

      const filteredNotifications = JSON.parse(message.toString())
        .map((notification: NotificationType) => ({
          ...notification,
          additionalData: JSON.stringify(notification.additionalData),
          isRead: false,
        }))
        .filter((message: NotificationType) => {
          // Filter by location
          const matchesLocation = assignedLocations?.includes(
            message.locationId
          );
          // Filter by recipients if array exists and has items
          const matchesRecipient =
            message.recipients && message.recipients?.length > 0
              ? username && message.recipients.includes(username)
              : true;

          return matchesLocation && matchesRecipient;
        });

      if (assignedCategories) {
        return filteredNotifications.filter((message: NotificationType) =>
          assignedCategories?.includes(message.category)
        );
      }

      return filteredNotifications;
    },
    [username]
  );

  const getTimeFilters = useCallback((timestamp: string) => {
    const timeFilterStart = timestamp.slice(0, 10);
    const timeFilterEnd = new Date(
      new Date(timeFilterStart).getTime() + 86400000
    )
      .toISOString()
      .slice(0, 10);
    return { timeFilterStart, timeFilterEnd };
  }, []);

  const getLocationOverviewURL = useCallback(
    (
      notification: NotificationType,
      timeFilters: { timeFilterStart: string; timeFilterEnd: string }
    ) => {
      const { timeFilterStart, timeFilterEnd } = timeFilters;
      const baseURL = `${window.location.origin}/location-overview?start=${timeFilterStart}&end=${timeFilterEnd}`;

      if (notification.ancestors && notification.ancestors.length > 1) {
        const encodedAncestors = encodeURIComponent(
          JSON.stringify(notification.ancestors.map((item) => item?.toString()))
        );
        return `${baseURL}&locations=${encodedAncestors}&location_id=${notification.ancestors.pop()}`;
      }

      return baseURL;
    },
    []
  );

  const getRedirectURL = useCallback(
    (
      notification: NotificationType,
      timeFilters: { timeFilterStart: string; timeFilterEnd: string }
    ) => {
      const { timeFilterStart, timeFilterEnd } = timeFilters;
      const baseURL = window.location.origin;
      const overviewType = 'asset-overview';

      const urlMap = {
        FEEDBACK: `/operator-feedback?start=${timeFilterStart}&end=${timeFilterEnd}&no-${FILTER_KEY_LOCATION}-filter=true&${FILTER_KEY_ASSET}=${
          notification.assetId
        }&selected=${
          JSON.parse(notification.additionalData!)?.selected
        }&sidebar=open`,
        ALARM: `/alarm-report?start=${timeFilterStart}&end=${timeFilterStart}&no-${FILTER_KEY_LOCATION}-filter=true&${FILTER_KEY_ASSET}=${notification.assetId}`,
        PARAMETER: `/${overviewType}/${notification.assetId}?date=${timeFilterStart}`,
        STATUS: `/${overviewType}/${notification.assetId}?date=${timeFilterStart}`,
        SPC: `/${overviewType}/${notification.assetId}?date=${timeFilterStart}&show-spc-list=true`,
        PRODUCTION: `/production-tracker?start=${timeFilterStart}&end=${timeFilterEnd}&suffix-page=1&type=production&search=${
          JSON.parse(notification.additionalData!).work_order
        }`,
        INSPECTION: `/inspection-report?start=${timeFilterStart}&end=${timeFilterEnd}&selected=${
          JSON.parse(notification.additionalData!).selected
        }&sidebar=open`,
        MAINTENANCE: `/maintenance-order?start=${timeFilterStart}&end=${timeFilterEnd}`,
      };

      for (const [key, url] of Object.entries(urlMap)) {
        if (notification.category.includes(key)) {
          return `${baseURL}${url}`;
        }
      }

      return getLocationOverviewURL(notification, timeFilters);
    },
    [getLocationOverviewURL]
  );

  const handleNotification = useCallback(
    (notification: NotificationType, redirectURL: string) => {
      if (!isPushNotificationSupported) {
        alert('This browser does not support push notification');
        return;
      }

      const message = translateMessageWithPredefinedKeys(notification.message);

      registerServiceWorker();
      Notification.requestPermission()
        .then(() => {
          playNotificationSound();
          new Notification(APP_NAME, {
            tag: 'AFDD_NOTIFICATION',
            silent: false,
            body: message,
            // @ts-ignore: renotify is not in all lib.dom versions
            renotify: true,
            icon: appIcon,
          }).onclick = () => {
            window.open(redirectURL, APP_NAME);
          };
        })
        .catch((e) => {
          throw e;
        });
    },
    []
  );

  const onMessage = useCallback(
    (_topic: string, message: Buffer) => {
      if (!userData) return;

      const notifPermissions = userData.permissions;

      const authorizedCategories: { id: number; name: string }[] = [];

      if (notifPermissions) {
        const authorizedPages = notifPermissions
          .filter((p) => p.alias === 'read')
          .map((p) => p.groupAlias);

        authorizedPages.forEach((page) => {
          const categories = PERMISSION_TO_CATEGORIES[page];

          if (categories) {
            categories.forEach((category) => {
              authorizedCategories.push(category);
            });
          }
        });
      }

      const authorizedCategoryAlias =
        authorizedCategories.length > 0
          ? authorizedCategories.map((c) => c.name)
          : [];

      const parsedMessages = parseAndFilterMessages(
        message,
        userData?.assignedLocations,
        userData.role && userData.role === 'superuser'
          ? undefined
          : authorizedCategoryAlias,
        userData.role && userData.role === 'superuser' ? true : false
      );
      const lastNotification = parsedMessages[parsedMessages.length - 1];

      if (!lastNotification) return;

      const timeFilters = getTimeFilters(lastNotification.timestamp);
      const redirectURL = getRedirectURL(lastNotification, timeFilters);

      handleNotification(lastNotification, redirectURL);
      updateNotificationState(parsedMessages);
    },
    [
      userData,
      getRedirectURL,
      PERMISSION_TO_CATEGORIES,
      handleNotification,
      parseAndFilterMessages,
      getTimeFilters,
    ]
  );

  const updateNotificationState = (parsedMessages: NotificationType[]) => {
    setIncomingNotifications((prev) => [...parsedMessages, ...prev]);
    setIncomingNotifCount((prev) => prev + parsedMessages.length);
  };

  // Without a broker (VITE_NOTIFY_MODE=poll, the cloud deployment) the newest
  // notifications are fetched every NOTIFY_POLL_MS; the first answer only marks
  // what exists, later ones raise the same alerts as broker messages.
  useEffect(() => {
    if (process.env.VITE_NOTIFY_MODE !== 'poll' || !userData) return;
    let lastId: number | null = null;
    let stopped = false;
    const poll = async () => {
      try {
        const today = formatDateHTMLInput(new Date());
        const page = await getNotifications(
          getLocalDateMidnight(today),
          getLocalDateMidnight(today),
          '',
          1,
          20,
          'all'
        );
        if (stopped) return;
        const list = page.notifications;
        const newest = list.reduce((m, n) => Math.max(m, n.id), lastId ?? 0);
        if (lastId !== null) {
          const fresh = list.filter((n) => n.id > (lastId ?? 0)).sort((a, b) => a.id - b.id);
          const latest = fresh[fresh.length - 1];
          if (latest) {
            handleNotification(latest, getRedirectURL(latest, getTimeFilters(latest.timestamp)));
            setIncomingNotifications((prev) => [...fresh.reverse(), ...prev]);
            setIncomingNotifCount((prev) => prev + fresh.length);
          }
        }
        lastId = newest;
      } catch {
        // the next poll retries
      }
    };
    void poll();
    const timer = window.setInterval(poll, NOTIFY_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [userData, handleNotification, getRedirectURL, getTimeFilters]);

  useEffect(() => {
    if (process.env.VITE_NOTIFY_MODE === 'poll') return;
    const username: string = (process.env.VITE_MQTT_USERNAME ?? '').toString();
    const password: string = (process.env.VITE_MQTT_PASSWORD ?? '').toString();
    const mqttAddress = process.env.VITE_MQTT_URL || `wss://${window.location.hostname}:9002/mqtt`;
    const mqttEndpoint = new URL(mqttAddress, window.location.origin);
    if (mqttEndpoint.protocol === 'http:') mqttEndpoint.protocol = 'ws:';
    if (mqttEndpoint.protocol === 'https:') mqttEndpoint.protocol = 'wss:';
    const topic = process.env.VITE_MQTT_NOTIFICATION_TOPIC || 'AFDD_NOTIFICATION';

    const notificationClient = mqtt.connect(mqttEndpoint.href, {
      clientId:
        'mqttjs_' +
        Math.random().toString(16).substring(2, 8) +
        new Date().toISOString(),
      username: username,
      password: password,
      rejectUnauthorized: false,
    });

    notificationClient.on('connect', function () {
      notificationClient.subscribe(topic);
    });
    notificationClient.on('message', onMessage);

    notificationClient.on('error', function (error) {
      console.error('Error:', error);
    });

    return () => {
      notificationClient.end(true);

      if (notificationClient.connected) {
        notificationClient.unsubscribe(topic);
      }
    };
  }, [onMessage]);

  const [from, setFrom] = useState<string | undefined>(
    formatDateHTMLInput(new Date())
  );
  const [to, setTo] = useState<string | undefined>(
    formatDateHTMLInput(new Date())
  );

  const [search, setSearch] = useState('');

  const fromISO = from ? getLocalDateMidnight(from) : null;
  const toISO = to ? getLocalDateMidnight(to) : null;

  const queryKey = [
    'NOTIFICATIONS',
    {
      from: fromISO,
      to: toISO,
      search,
      username,
      enabled,
      notifType,
    },
  ];

  const {
    data: notifications,
    refetch: refetchNotifications,
    fetchNextPage,
    isFetching: isLoading,
  } = useInfiniteQuery({
    queryFn: ({ pageParam }) => {
      setIncomingNotifications([]);
      return getNotifications(fromISO, toISO, search, pageParam, 10, notifType);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam, _allPageParams) =>
      lastPage.isExtend ? lastPageParam + 1 : null,
    queryKey,
    staleTime: 0,
    enabled: enabled && toISO! >= fromISO!,
    meta: {
      toastId: 'NOTIFICATION_LIST',
    },
  });

  const UNREAD_NOTIFICATION_QUERY_KEY = 'UNREAD_NOTIFICATION';
  const {
    data: unreadNotificationCounts,
    refetch: refetchUnreadNotificationCount,
  } = useQuery({
    queryFn: () => {
      setIncomingNotifCount(0);
      return getUnreadNotificationCounts(username || '');
    },
    queryKey: [
      UNREAD_NOTIFICATION_QUERY_KEY,
      {
        username,
      },
    ],
    meta: {
      toastId: 'NOTIFICATION_UNREAD_COUNTS',
    },
  });

  const queryClient = useQueryClient();

  const { mutate: mutateRead } = useMutation({
    mutationFn: (data: UpdateReadStatus) => updateReadStatus(data),
    onMutate: async ({ id, isRead }) => {
      await queryClient.cancelQueries({
        queryKey,
      });
      if (incomingNotifications) {
        setIncomingNotifications((prev) => {
          return prev.map((notif) => {
            if (notif.id === id) {
              return { ...notif, isRead: !notif.isRead };
            } else {
              return { ...notif };
            }
          });
        });
      }

      queryClient.setQueryData<InfiniteData<GetNotifications>>(
        queryKey,
        (oldData) => {
          const newData = oldData?.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notif) => {
              if (notif.id === id)
                return {
                  ...notif,
                  isRead,
                };
              else return notif;
            }),
          }));
          return {
            pageParams: oldData?.pageParams ?? [],
            pages: newData ?? [],
          };
        }
      );
    },
    onSuccess: () => {
      refetchUnreadNotificationCount();
      if (notifType !== 'all') {
        refetchNotifications();
      }
    },
    meta: { toastId: 'UPDATE_NOTIFICATION_READ_STATUS', hideToast: true },
  });

  const { mutate: readAllNotifs } = useMutation({
    mutationFn: () => readAllNotifications(username ?? ''),
    onSuccess: () => {
      refetchUnreadNotificationCount();
      refetchNotifications();
    },
  });

  const handleReadAllNotif = () => {
    readAllNotifs();
  };

  const handleReadUnread = (notifId: number, isRead: boolean) => {
    mutateRead({
      id: notifId,
      isRead: !isRead,
    });
  };

  const handleTypeChange = (type: 'all' | 'unread') => {
    setNotifType(type);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setFrom(formatDateHTMLInput(startDate));
    setTo(formatDateHTMLInput(endDate));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const { scrollHeight, scrollTop, clientHeight } =
      e.target as HTMLDivElement;
    const SCROLL_THRESHOLD = 1;
    if (scrollHeight - scrollTop <= clientHeight + SCROLL_THRESHOLD) {
      fetchNextPage();
    }
  };

  const dtMidnights: Date[] = [];

  if (
    notifications &&
    notifications.pages &&
    notifications.pages[0].notifications.length > 0
  ) {
    if (incomingNotifications.length > 0) {
      incomingNotifications.forEach((notif) => {
        dtMidnights.push(getMidnightDate(notif.timestamp));
      });
    }
    notifications.pages.forEach((data) => {
      data.notifications.forEach((notif) => {
        dtMidnights.push(getMidnightDate(notif.timestamp));
      });
    });
  } else {
    incomingNotifications.forEach((notif) => {
      dtMidnights.push(getMidnightDate(notif.timestamp));
    });
  }

  const uniqueDt = dtMidnights.filter(
    (value, index, array) => array.map((dt) => +dt).indexOf(+value) === index
  );

  return {
    notifType,
    from: new Date(from ?? ''),
    to: new Date(to ?? ''),
    incomingNotifications,
    search,
    notifications: notifications,
    unreadNotificationCounts: unreadNotificationCounts
      ? unreadNotificationCounts
      : 0,
    uniqueDt,
    isLoading,
    incomingNotifCount,
    mutateRead,
    handleDateChange,
    handleTypeChange,
    handleSearchChange,
    handleReadAllNotif,
    handleReadUnread,
    handleScroll,
    fetchNextPage,
  };
};
