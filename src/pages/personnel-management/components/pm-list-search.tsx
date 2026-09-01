import { Search } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import { useExtractFilterPM } from '../filter/filter.extract';

interface PMListSearchProps {
  className?: string;
}

export const PMListSearch = ({ className }: PMListSearchProps) => {
  const {
    filter: { search },
    setFilter,
  } = useExtractFilterPM();

  const changeSearch = (search: string) => {
    setFilter((prev) => ({ ...prev, search }));
  };

  return (
    <Search
      value={search}
      onChange={changeSearch}
      placeholder={t('common.search')}
      wrapperClassName={className}
    />
  );
};
