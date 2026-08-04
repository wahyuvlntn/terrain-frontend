import { SetURLSearchParams } from 'react-router-dom';

export const useUserGroupCard = (
  alias: string,
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams
) => {
  /* Event handler when the card is clicked */
  const handleCardClick = () =>
    setSearchParams((prev) => {
      prev.set('ug_alias', alias);
      return prev;
    });

  /* State that defines whether the card is selected or not */
  const isSelected = searchParams.get('ug_alias') === alias;
  return {
    handleCardClick,
    isSelected,
  };
};
