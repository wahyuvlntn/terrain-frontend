import { jsRequest } from '@digital-twin/utils';

export const submitUnsubscribedUsers = async (data: {
  selected_usernames: string;
  type_id: number;
  unselected_usernames: string;
}) => {
  const response = await jsRequest({
    url: `/notification/SubmitUnsubscribedUsers`,
    data,
  });

  return response;
};
