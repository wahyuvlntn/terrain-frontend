import { jsRequest } from '@digital-twin/utils';

export const registerEmailNotification = async (data: {
  alias: string;
  interval: number;
  is_active: boolean;
  is_secure: boolean;
  name: string;
  sender_email: string;
  sender_name: string;
  sender_password: string;
  smtp_host: string;
  smtp_port: number;
}) => {
  const response = await jsRequest({
    url: `/notification/registeremailnotification`,
    data,
  });

  return response;
};
