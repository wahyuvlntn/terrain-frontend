// React builtins
// Reusables
import { jsRequest } from '@digital-twin/utils';
// For queries & mutations
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
// For creating schemas
import { z } from 'zod';

// Contexts
// Custom schemas
import {
  licenseContentSchema,
  licenseInfoSchema,
  licenseSchema,
  UpdateLicenseFormType,
  UploadLicenseFileFormType,
  VerifyLicenseFileFormType,
} from '../schemas';

// Query keys
const keys = {
  systemId: 'licenseSystemId',
  licenses: 'licenses',
  licenseInfo: 'licenseInfo',
};

// Query factory
const queries = {
  systemId: () =>
    queryOptions({
      queryKey: [keys.systemId] as const,
      queryFn: async ({ signal }) =>
        z.string().parse(
          await jsRequest({
            url: `/license/get_license_system_id`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.systemId,
      },
    }),
  licenses: () =>
    queryOptions({
      queryKey: [keys.licenses] as const,
      queryFn: async ({ signal }) =>
        licenseSchema.array().parse(
          await jsRequest({
            url: `/license/get_licenses`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.licenses,
      },
    }),
  licenseInfo: (key?: string, enabled?: boolean) =>
    queryOptions({
      queryKey: [keys.licenses, key] as const,
      queryFn: async ({ queryKey: [, key], signal }) => {
        if (!key) {
          throw new Error('Invalid license key');
        }

        const body = new FormData();
        body.append('license_key', key);

        return licenseInfoSchema.parse(
          await jsRequest({
            url: `/license/get_license_information`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!key && enabled,
      meta: {
        toastId: keys.licenseInfo,
      },
    }),
};

export const useSystemId = () => {
  const { data, isLoading, isFetching } = useQuery(queries.systemId());

  return { data, isLoading: isLoading || isFetching };
};

export const useLicenses = () => {
  const { data, isLoading, isFetching } = useQuery(queries.licenses());

  return { data, isLoading: isLoading || isFetching };
};

export const useLicenseInfo = (key?: string, enabled?: boolean) => {
  const { data, isLoading, isFetching } = useQuery(
    queries.licenseInfo(key, enabled)
  );

  return { data, isLoading: isLoading || isFetching };
};

export function useDeleteLicense() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (licenseKey: string) => {
      const body = new FormData();
      body.append('license_key', licenseKey);

      await jsRequest({
        url: `/license/delete_license`,
        data: body,
      });
    },
    onSuccess: () => {
      // Invalidate licenses cache
      queryClient.invalidateQueries({
        queryKey: queries.licenses().queryKey,
      });
    },
  });

  return { mutate, isPending };
}

export function useUploadLicense() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UploadLicenseFileFormType) => {
      const body = new FormData();
      body.append('license_name', form.license_name);
      body.append('license_file', form.license_file);

      await jsRequest({
        url: `/license/upload_license`,
        data: body,
      });

      return form;
    },
    onSuccess: () => {
      // Invalidate licenses cache
      queryClient.invalidateQueries({
        queryKey: queries.licenses().queryKey,
      });
    },
  });

  return { mutate, isPending };
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateLicenseFormType) => {
      const body = new FormData();
      body.append('license_key', form.license_key);
      body.append('license_name', form.license_name);

      if (form.license_file) {
        body.append('license_file', form.license_file);
      }

      await jsRequest({
        url: `/license/update_license`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Invalidate licenses cache
      queryClient.invalidateQueries({
        queryKey: queries.licenses().queryKey,
      });

      // Invalidate licenseInfo cache
      queryClient.invalidateQueries({
        queryKey: queries.licenseInfo(form.license_key).queryKey,
      });
    },
  });

  return { mutate, isPending };
}

export function useVerifyLicense() {
  const { mutate, isPending } = useMutation({
    mutationFn: async ({ license_file }: VerifyLicenseFileFormType) => {
      const body = new FormData();
      body.append('license_file', license_file);

      return licenseContentSchema.parse(
        await jsRequest({
          url: `/license/verify_license`,
          data: body,
        })
      );
    },
  });

  return { mutate, isPending };
}
