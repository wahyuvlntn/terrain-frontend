// import { useQuery } from '@tanstack/react-query';

// import { getSPCData } from '../api';

// export const useSPCLineChart = (
//   parameterId: number,
//   date: string,
//   enabled: boolean
// ) => {
//   const timezoneOffset = new Date().getTimezoneOffset();
//   const queryKey = [
//     'SPC',
//     {
//       parameterId,
//       date,
//       timezoneOffset,
//     },
//   ] as const;
//   const { data, isLoading } = useQuery({
//     queryFn: () => getSPCData(parameterId, date, timezoneOffset),
//     //eslint-disable-next-line @tanstack/query/exhaustive-deps
//     queryKey,
//     enabled: !!date && enabled,
//     meta: {
//       toastId: `SPC-${parameterId}`,
//     },
//   });

//   return { data, isLoading };
// };
