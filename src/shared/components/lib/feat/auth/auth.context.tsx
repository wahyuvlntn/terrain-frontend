import {
  addDays,
  getDiffDays,
  getPostSigninPath,
  getSigninUrl,
  SESSION_ID_HEADER,
} from '@digital-twin/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { createContext } from 'react';
import {
  Outlet,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { z } from 'zod';

import {
  credentialsSchema,
  getUserData,
  signin,
  TPermissionAliasEnum,
  TPermissionGroupAliasEnum,
  UserData,
} from './auth.api';

export const USERNAME_LOCAL_STORAGE_KEY = 'digital-twin-username';
export const CREDENTIALS_LOCAL_STORAGE_KEY = 'digital-twin-credentials';
export const USER_DATA_LOCAL_STORAGE_KEY = 'digital-twin-user-data';

const REMEMBER_ME_CREDS_EXPIRY_TIME_IN_DAYS = 30;

const credentialsWithOptsSchema = credentialsSchema.extend({
  isRememberMe: z.boolean(),
});

type CredentialsWithOpts = z.infer<typeof credentialsWithOptsSchema>;

const credentialsWithExpiryDateSchema = credentialsSchema.extend({
  expiredAt: z.string().datetime(),
});

type AuthCtx = {
  signin: (
    username: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  signout: () => void;
  userData?: UserData;
  isAuthenticated: boolean;
  username?: string;
  hasPermission: (
    groupAlias: TPermissionGroupAliasEnum,
    alias: TPermissionAliasEnum
  ) => boolean;
  initialUsername: string;
  initialPassword: string;
  initialIsRemember: boolean;
};

export const AuthCtx = createContext<AuthCtx>({
  signin: async () => {},
  userData: undefined,
  signout: () => {},
  isAuthenticated: false,
  username: undefined,
  hasPermission: () => false,
  initialUsername: '',
  initialIsRemember: false,
  initialPassword: '',
});

export const USER_DATA_QUERY_KEY = ['GET_USER_DATA'];

export const AuthCtxProvider = () => {
  const isAuthenticated = !!window.localStorage.getItem(
    SESSION_ID_HEADER
  );
  const { data: userData, refetch } = useQuery({
    queryFn: () => getUserData(),
    queryKey: USER_DATA_QUERY_KEY,
    enabled: isAuthenticated,
    meta: { toastId: 'USER_DATA' },
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const credentialsString = window.localStorage.getItem(
    CREDENTIALS_LOCAL_STORAGE_KEY
  );
  const credentials = credentialsString
    ? z
        .string()
        .refine((value) => {
          try {
            JSON.parse(atob(value));
            return true;
          } catch (_) {
            return false;
          }
        })
        .transform((value) => JSON.parse(atob(value)))
        .pipe(credentialsWithExpiryDateSchema)
        .parse(credentialsString)
    : null;

  const isRememberMeCredsValid = credentials
    ? getDiffDays(new Date(), new Date(credentials.expiredAt)) <=
      REMEMBER_ME_CREDS_EXPIRY_TIME_IN_DAYS
    : false;

  const { mutateAsync } = useMutation({
    mutationFn: (credentials: CredentialsWithOpts) => signin(credentials),
    onSuccess: (response, ctx) => {
      if (response !== undefined) {
        window.localStorage.setItem(
          SESSION_ID_HEADER,
          response
        );
        refetch();
        window.localStorage.setItem(USERNAME_LOCAL_STORAGE_KEY, ctx.username);
        if (ctx.isRememberMe)
          window.localStorage.setItem(
            CREDENTIALS_LOCAL_STORAGE_KEY,
            btoa(
              JSON.stringify({
                username: ctx.username,
                password: ctx.password,
                expiredAt: addDays(
                  new Date(),
                  REMEMBER_ME_CREDS_EXPIRY_TIME_IN_DAYS
                ).toISOString(),
              })
            )
          );
        else window.localStorage.removeItem(CREDENTIALS_LOCAL_STORAGE_KEY);

        const redirect = searchParams.get('redirect-url');
        navigate(getPostSigninPath(redirect), { replace: true });
      }
    },
    meta: {
      toastId: 'LOGIN',
      hideToast: true,
    },
  });

  const handleSignin = (
    username: string,
    password: string,
    remmemberMe: boolean
  ) =>
    mutateAsync({ username, password, isRememberMe: remmemberMe }).then(
      () => {}
    );

  const handleSignout = () => {
    window.localStorage.removeItem(USER_DATA_LOCAL_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_ID_HEADER);
    window.localStorage.removeItem(USERNAME_LOCAL_STORAGE_KEY);
    window.location.replace(getSigninUrl(window.location));
  };

  const hasPermission = (
    groupAlias: TPermissionGroupAliasEnum,
    alias: TPermissionAliasEnum
  ) => {
    if (userData?.role === 'superuser' || userData?.role === 'admin')
      return true;
    return (
      userData?.permissions?.some(
        (item) => item.alias === alias && item.groupAlias === groupAlias
      ) ?? true
    );
  };

  return (
    <AuthCtx.Provider
      value={{
        signin: handleSignin,
        userData,
        signout: handleSignout,
        isAuthenticated,
        username:
          window.localStorage.getItem(USERNAME_LOCAL_STORAGE_KEY) ?? undefined,
        hasPermission,
        initialPassword: isRememberMeCredsValid
          ? credentials?.password ?? ''
          : '',
        initialUsername: isRememberMeCredsValid
          ? credentials?.username ?? ''
          : '',
        initialIsRemember: isRememberMeCredsValid,
      }}
    >
      <Outlet />
    </AuthCtx.Provider>
  );
};
