import { InputDuration } from '@digital-twin/components';
import { formatDateHTMLInput } from '@digital-twin/utils';
import { useExtractFilterPM } from '../filter/filter.extract';

export const PMInputDuration = () => {
  const { filter, setFilter } = useExtractFilterPM();

  const startDate = filter.start
    ? new Date(filter.start + 'T00:00:00.000')
    : new Date(Date.now() - 86400000 * 7);

  const endDate = filter.end ? new Date(filter.end + 'T00:00:00.000') : new Date();

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setFilter((prev) => ({
      ...prev,
      start: formatDateHTMLInput(startDate),
      end: formatDateHTMLInput(endDate),
    }));
  };

  return (
    <InputDuration
      type="daterange"
      onChange={handleDateChange}
      endDate={endDate}
      startDate={startDate}
      maxDate={new Date()}
    />
  );
};
