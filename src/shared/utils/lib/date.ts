import { t } from 'i18next';

// Format date to dd MMM yy
export const formatDateShort = (date: Date) => {
  const parts = date
    .toLocaleDateString('en-SG', {
      year: '2-digit',
      month: 'short',
      day: '2-digit',
    })
    .split(' ');

  return `${parts[0]} ${parts[1]} '${parts[2]}`;
};

//TODO: remove this since it's not used anywhere
// // Format date to dd MMM yyyy
export const formatDateLong = (date: Date) => {
  return date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

// Format date to dd MMMM yyyy
export const formatDateLongLong = (date: Date) => {
  return date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
};

// Format date to dd/MM/yyyy
export const formatDateSlash = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Format date to yyyy-MM-dd
export const formatDateHTMLInput = (
  date: Date,
  type: 'date' | 'datetime-local' = 'date'
) => {
  const _date = date.toLocaleDateString('en-CA');
  if (type === 'date') return _date;

  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

//TODO: remove this since it's not used anywhere
// Format date export yyyy-MM-dd__hh-mm
// export const formatDateTimeExport = (dateIn: Date) => {
//   const year = dateIn.getFullYear();
//   const month = String(dateIn.getMonth() + 1).padStart(2, '0');
//   const date = String(dateIn.getDate()).padStart(2, '0');
//   const hours = String(dateIn.getHours()).padStart(2, '0');
//   const minutes = String(dateIn.getMinutes()).padStart(2, '0');
//
//   return `${year}-${month}-${date}_${hours}-${minutes}`;
// };

// Format date export yyyy-MM-dd
export const formatDateExport = (dateIn: Date) => {
  const year = dateIn.getFullYear();
  const month = String(dateIn.getMonth() + 1).padStart(2, '0');
  const date = String(dateIn.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
};

// Format date to dd MMM yyyy, hh:mm:ss
export const formatDateTime = (date: Date) => {
  return date.toLocaleDateString('en-UK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
};

// Format date to dd MMM yyyy, hh:mm
export const formatDateTimeWithoutSec = (date: Date) => {
  return date.toLocaleDateString('en-UK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
};

export const formatDateTimeFull = (date: Date) => {
  // Padding function to ensure each date component has leading zero if necessary
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');

  // Get date components
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1, 2); // getMonth() returns 0-based month
  const day = pad(date.getDate(), 2);
  const hours = pad(date.getHours(), 2);
  const minutes = pad(date.getMinutes(), 2);
  const seconds = pad(date.getSeconds(), 2);
  const milliseconds = pad(date.getMilliseconds(), 3);

  // Get the timezone offset in minutes and convert it to a string
  const tzOffset = date.getTimezoneOffset();
  const offsetSign = tzOffset > 0 ? '-' : '+'; // Timezone offset sign
  const offsetHours = pad(Math.floor(Math.abs(tzOffset) / 60), 2);
  const offsetMinutes = pad(Math.abs(tzOffset) % 60, 2);

  // Format the date string
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${offsetSign}${offsetHours}${offsetMinutes}`;
};

// Format date to dd MMM yyyy
export const formatDate = (date: Date) => {
  const daysOfWeek = [
    t('common.sunday'),
    t('common.monday'),
    t('common.tuesday'),
    t('common.wednesday'),
    t('common.thursday'),
    t('common.friday'),
    t('common.saturday'),
  ];
  const monthsOfYear = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = monthsOfYear[date.getMonth()];
  const year = date.getFullYear();

  return `${dayOfWeek}, ${dayOfMonth} ${month} ${year}`;
};
// Format date to hh:mm
export const formatTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

// Format duration (in seconds) to {dayCounts}d {hourCounts}h
export const formatDuration = (durationSeconds: number) => {
  const dayCounts = Math.floor(durationSeconds / 86400);
  const hourCounts = Math.floor((durationSeconds - dayCounts * 86400) / 3600);

  return `${dayCounts}d ${hourCounts}h`;
};

// Format duration (in seconds) to {dayCounts}d {hourCounts}h {minuteCounts}m
export const formatDurationToMinutes = (durationSeconds: number) => {
  const dayCounts = Math.floor(durationSeconds / 86400);
  const hourCounts = Math.floor((durationSeconds - dayCounts * 86400) / 3600);
  const minuteCounts = Math.floor(
    (durationSeconds - dayCounts * 86400 - hourCounts * 3600) / 60
  );

  return `${dayCounts}d ${hourCounts}h ${minuteCounts}m`;
};

// Format duration (in seconds) to {hourCounts}h {minuteCounts}m
export const formatDurationInhm = (durationSeconds: number) => {
  const hourCounts = Math.floor(durationSeconds / 3600);
  const minuteCounts = Math.floor((durationSeconds - hourCounts * 3600) / 60);

  return `${hourCounts}h ${minuteCounts}m`;
};

export const formatDurationToMinutesFromDate = (date: Date) => {
  const durationSeconds = (Date.now() - date.getTime()) / 1000;
  return formatDurationToMinutes(durationSeconds);
};

export const formatDurationFromDate = (date: Date) => {
  const durationSeconds = (Date.now() - date.getTime()) / 1000;
  return formatDuration(durationSeconds);
};
export const addDays = (date: Date, dayCounts: number) => {
  const dt = new Date(date);
  return new Date(dt.setDate(dt.getDate() + dayCounts));
};

export const getDiffDays = (date1: Date, date2: Date) => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getLocalDateMidnight = (date: string) => {
  const tzo = -new Date(date).getTimezoneOffset(),
    dif = tzo >= 0 ? '+' : '-',
    pad = function (num: number) {
      return (num < 10 ? '0' : '') + num;
    };

  return `${date}T00:00:00${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(
    Math.abs(tzo) % 60
  )}`;
};

export const formatStringToObjectDate = (date: string) => {
  const parts = date.split('-');
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
};
