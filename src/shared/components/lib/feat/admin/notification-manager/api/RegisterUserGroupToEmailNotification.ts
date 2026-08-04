import { jsRequest } from '@digital-twin/utils';

export const registerUserGroupToEmailNotification = async (data: {
  input: string;
}) => {
  const response = await jsRequest({
    url: `/notification/registerusergrouptoemailnotification`,
    data,
  });

  return response;
};
