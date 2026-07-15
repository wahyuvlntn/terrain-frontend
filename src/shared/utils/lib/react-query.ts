import { toast } from '@digital-twin/reusables';
import {
  keepPreviousData,
  MutationCache,
  QueryCache,
  type QueryClientConfig,
} from '@tanstack/react-query';

import { getErrorTranslation, getMessageTranslation } from './i18n/util';

export const showToastError = (error: unknown, toastId: string) => {
  if (typeof error === 'string') {
    toast.error(getMessageTranslation(error), {
      toastId,
    });
  } else if (error instanceof Error) {
    // @ts-expect-error details field is exist
    toast.error(getErrorTranslation(error) || error?.details?.error, {
      toastId,
    });
  } else {
    toast.error(String(error), {
      toastId,
    });
  }
};

const showToastSuccess = (data: unknown, toastId: string) => {
  if (typeof data === 'string') {
    // check translation
    toast.success(getMessageTranslation(data), {
      toastId,
    });
  } else if (data instanceof Error) {
    toast.success(getErrorTranslation(data), {
      toastId,
    });
  } else {
    toast.success(String(data), {
      toastId,
    });
  }
};

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
      retry: process.env.VITE_DEV === 'true'
        ? false
        : (failureCount, error) => {
            // @ts-expect-error statusCode field is exist
            if (error?.statusCode === 400 || error?.statusCode === 401)
              return false;
            return failureCount < 4;
          },
      refetchIntervalInBackground: true,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      const toastId = query.meta?.['toastId'] as string;
      showToastError(error, toastId);
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, _var, _ctx, mutation) => {
      if (mutation.meta?.['hideToast']) return;

      const toastId = mutation.meta?.['toastId'] as string;
      if (toastId) {
        showToastSuccess(data, toastId);
      }
    },
    onError: (error, _var, _ctx, mutation) => {
      const toastId = mutation.meta?.['toastId'] as string;
      showToastError(error, toastId);
    },
  }),
};
