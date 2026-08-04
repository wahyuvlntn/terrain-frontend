import { SetURLSearchParams } from 'react-router-dom';

export const useUserGroupNotifSettings = (
  searchParams: URLSearchParams /* searchParams */,
  setSearchParams: SetURLSearchParams /* setSearchParams */
) => {
  /* Selected tab id in settings container */
  const tabValue = searchParams.get('tab') || 'category';

  /* Tab change handler */
  const handletTabChange = (e: string) => {
    setSearchParams((prev) => {
      prev.set('tab', e);
      return prev;
    });
  };

  return {
    tabValue,
    handletTabChange,
  };
};
