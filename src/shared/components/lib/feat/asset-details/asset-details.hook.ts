import {
  addDays,
  formatDateHTMLInput,
  formatStringToObjectDate,
} from '@digital-twin/utils';
import { useParams, useSearchParams } from 'react-router-dom';

import { useGetLocationNames } from '../filter';

export type AssetIdParams = {
  id: string;
};
export const useAssetDetailsFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const { id } = useParams<AssetIdParams>();
  const assetId = parseInt(id ?? '0');

  const date = searchParams.get('date') || formatDateHTMLInput(new Date());
  const handleChangeDate = (date: string) =>
    setSearchParams((prev) => {
      prev.set('date', date);
      return prev;
    });

  const timezoneOffset = new Date().getTimezoneOffset();

  const { names: locationNames } = useGetLocationNames({
    isReady: true,
    queryParams: {
      locationIds: [],
      assetIds: [assetId],
    },
  });

  return {
    assetId,
    handleChangeDate,
    date,
    from: date,
    to: formatDateHTMLInput(addDays(formatStringToObjectDate(date), 1)),
    locationNames,
    timezoneOffset,
  };
};
