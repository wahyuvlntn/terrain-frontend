import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { redirectToSignin } from './auth-redirect';
import { t } from './i18n';
import { DATABASE_ALIAS, ORG_ALIAS, PROJECT_ALIAS } from './org-prj';
import { showToastError } from './react-query'; // Typedefs

// Typedefs
interface Request extends AxiosRequestConfig {
  body?: unknown;
}

interface HTTPErrorType {
  statusCode?: number | undefined;
  statusText?: string | undefined;
  message?: string | undefined;
  details?: object | undefined;
  isCancelled?: boolean | undefined;
  isConnectivityIssue?: boolean | undefined;
}

// Our custom HttpError class
class HttpError extends Error {
  public statusCode: number | undefined;
  public statusText: string | undefined;
  public details: object | undefined;
  public isCancelled: boolean;
  public isConnectivityIssue: boolean;

  constructor({
    statusCode,
    statusText,
    message,
    details,
    isCancelled,
    isConnectivityIssue,
  }: HTTPErrorType) {
    super(message);
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.details = details;
    this.isCancelled = isCancelled ?? false;
    this.isConnectivityIssue = isConnectivityIssue ?? false;
  }
}

export const SESSION_ID_HEADER = 'X-AFDD-Session-Id';

axios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    const sessionId = localStorage.getItem(SESSION_ID_HEADER);
    if (sessionId)
      config.headers[SESSION_ID_HEADER] = sessionId;
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Same-origin requests work with the dev proxy, nginx, or the backend's static server.
export const getURL = () => (process.env.VITE_API_URL || '').replace(/\/$/, '');

export const getURLExplicit = () => getURL() || window.location.origin;

export const request = async ({
  method = 'POST',
  url = '',
  headers = {},
  body = {},
  ...options
}: Request) => {
  try {
    // Prepare axios config
    const config = {
      method: method,
      url: getURL() + url,
      headers: headers,
      data: body,
      ...options,
    };

    const { data } = await axios(config);

    return data;
  } catch (e) {
    if (e instanceof AxiosError) {
      let statusCode: number | undefined;
      let statusText: string | undefined;
      let message: string | undefined;
      let details: object | undefined;
      let isCancelled = false;
      let isConnectivityIssue = false;

      if (e.code === 'ERR_NETWORK') {
        showToastError(t('common.err_network_error'), 'ERR_NETWORK');
        throw new Error(t('common.err_network_error'));
      }

      if (!e.response && !e.request) {
        throw new Error('UNKNOWN ERROR');
      }

      if (axios.isCancel(e)) {
        isCancelled = true;
      }

      if (e.response) {
        statusCode = e.response.status;
        statusText = e.response.statusText;

        if (statusCode === 401) {
          message = 'Unauthorized, please re-login';
          redirectToSignin();
        }
        if (e.response.data) {
          if (typeof e.response.data === 'object') {
            details = e.response.data;

            if (e.response.data.message != null) {
              message = e.response.data.message;
            } else if (e.response.data.error) {
              message = String(e.response.data.error);
            }
          } else {
            message = String(e.response.data);
          }
        }
      } else {
        isConnectivityIssue = true;
        message = 'Cannot connect to backend server';
      }

      console.error(details, message, 'ERRORRS');

      throw new HttpError({
        statusCode,
        statusText,
        message,
        details,
        isCancelled,
        isConnectivityIssue,
      });
    } else if (e instanceof Error) {
      throw e.message;
    } else {
      throw new Error('UNKNOWN ERROR');
    }
  }
};

type DBRequestParams = Request & {
  dbType: 'business' | 'machine';
};
export const dbRequest = async (req: DBRequestParams) => {
  // eslint-disable-next-line no-useless-catch
  try {
    return await request({
      ...req,
      url: `/api/database-connection/exposed/execute/${ORG_ALIAS()}/${PROJECT_ALIAS()}/${DATABASE_ALIAS(
        req.dbType
      )}${req.url}`,
    });
  } catch (e) {
    throw e;
  }
};

export const jsRequest = async (req: Request) => {
  // eslint-disable-next-line no-useless-catch
  try {
    const response = await request({
      ...req,
      url: `/api/js-service/exposed/execute/${ORG_ALIAS()}/${PROJECT_ALIAS()}${
        req.url
      }`,
      headers: {
        ...req.headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.error) throw new Error(response.error);

    return response.data;
  } catch (e) {
    throw e;
  }
};
