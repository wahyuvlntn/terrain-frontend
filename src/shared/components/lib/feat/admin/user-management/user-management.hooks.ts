import { useState } from 'react';

export const useUserManagement = () => {
  const [selected, setSelected] = useState<{
    type: string;
    value: string | null;
  }>({
    type: '',
    value: null,
  });

  const [searchValue, setSearchValue] = useState('');
  const [ascendingUg, setAscendingUg] = useState<boolean | null>(null);
  const [ascendingLoc, setAscendingLoc] = useState<boolean | null>(null);

  return {
    selected,
    setSelected,
    searchValue,
    setSearchValue,
    ascendingUg,
    setAscendingUg,
    ascendingLoc,
    setAscendingLoc,
  };
};
