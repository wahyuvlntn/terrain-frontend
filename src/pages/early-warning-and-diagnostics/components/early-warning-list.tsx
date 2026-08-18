import {
  COLOR,
  Container,
  InfoTooltip,
  Loading,
  Pagination2 as Pagination,
  Search,
  useExtractFilter,
} from '@digital-twin/components';
import { ListAlt } from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import { RenderEarlyWarningType } from '../../maintenance-order/components/diagnostic-overview';
import { RenderMaintenanceSeverity } from '../../maintenance-order/components/maintenance-order-card';
import {
  CurrentIssueType,
  EarlyWarningItem,
  EarlyWarningListResponse,
  getEarlyWarningList,
} from '../api/early-warning-and-diagnostics';
import { EarlyWarningFilterType, GeneralFilterType } from '../type';
import styles from './early-warning-list.module.scss';

type FilterButtonProps = {
  label: string;
  count: number;
  isActive: boolean;
  variant: 'warning' | 'critical';
  onClick: () => void;
};

const FilterButton = ({ label, count, isActive, variant, onClick }: FilterButtonProps) => {
  const color =
    variant === 'warning' ? COLOR.conditionWarningPrimary : COLOR.conditionCriticalPrimary;

  return (
    <div
      className={`${styles.filterButton} ${!isActive ? styles['filterButton--inactive'] : ''}`}
      style={{ borderColor: color }}
      onClick={onClick}
    >
      <div className={styles.filterButtonBackground} style={{ background: color }} />
      <div className={styles.filterButtonContent}>
        <div>{label}:</div>
        <div>{count}</div>
      </div>
    </div>
  );
};

type EarlyWarningCardProps = {
  data: EarlyWarningItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onShowAdditionalIssues: (boundingRect: DOMRect, issues: CurrentIssueType[]) => void;
  wrapperStyle?: CSSProperties;
};

export const EarlyWarningCard = ({
  data: d,
  isSelected,
  onSelect,
  onShowAdditionalIssues,
  wrapperStyle,
}: EarlyWarningCardProps) => {
  return (
    <div
      className={`${styles.card} ${isSelected ? styles['card--selected'] : ''}`}
      style={{
        background: isSelected ? COLOR.backgroundHigh : COLOR.backgroundDefault,
        borderColor: isSelected ? COLOR.brandBorderLightPrimary : undefined,
        ...wrapperStyle,
      }}
      onClick={() => onSelect(d.id.toString())}
    >
      <div className={styles.cardHeader}>
        <div className={styles.assetName}>{d.asset_name}</div>
        <div className={styles.badgeContainer}>
          {d.current_issues && d.current_issues.length > 0 && (
            <RenderEarlyWarningType
              type={d.current_issues && d.current_issues.length > 1 ? 'COMPOUND' : 'DEGRADATION'}
            />
          )}
          <RenderMaintenanceSeverity
            severity={d.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'}
          />
        </div>
      </div>
      <div className={styles.cardRow}>
        <div>Model:</div>
        <div className={styles.fieldValue}>{d.model}</div>
      </div>
      <div className={styles.cardRow}>
        <div>Current Issue:</div>
        {d.current_issues && d.current_issues.length > 0 && (
          <div className={styles.issueContent}>
            <div>{d.current_issues[0].code}</div>
            <div
              className={styles.separator}
              style={{ background: COLOR.neutralTextTitleHeading }}
            />
            <div className={styles.issueName} title={d.current_issues[0].name}>
              {d.current_issues[0].name}
            </div>
            {d.current_issues.length > 1 && (
              <div
                className={styles.additionalIssuesBadge}
                style={{ background: COLOR.backgroundLow }}
                onClick={(e) => {
                  e.stopPropagation();
                  const boundingRect = e.currentTarget.getBoundingClientRect();
                  if (d.current_issues) onShowAdditionalIssues(boundingRect, d.current_issues);
                }}
              >
                +{d.current_issues.length - 1}
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.cardRow}>
        <div>Timestamp:</div>
        <div className={styles.fieldValue}>
          {format(new Date(d.timestamp), 'dd MMM yyyy, HH:mm')}
        </div>
      </div>
    </div>
  );
};

export const EarlyWarningList = () => {
  const { filter, setFilter, data } = useExtractFilter<GeneralFilterType, EarlyWarningFilterType>();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const limit = useVerticalLimit({ container, itemHeight: 120, itemGap: 8 });

  const start_time = useMemo(() => {
    const time = filter.start ? new Date(filter.start) : new Date();
    time.setHours(0, 0, 0);
    return time.toISOString();
  }, [filter.start]);

  const end_time = useMemo(() => {
    const time = filter.end ? new Date(filter.end) : new Date();
    time.setDate(time.getDate() + 1);
    time.setHours(0, 0, 0);
    return time.toISOString();
  }, [filter.end]);

  const page = Number(filter.page || 1);
  const search = filter.search;
  const include_compound = filter.compound === 'true';
  const include_degradation = filter.degradation === 'true';

  const { data: earlyWarningData, isFetching } = useQuery({
    queryKey: [
      'getEarlyWarningList',
      {
        start_time,
        end_time,
        filter: JSON.stringify(data),
        include_compound,
        include_degradation,
        page,
        search,
        limit: limit || 1,
      },
    ] as const,
    queryFn: () =>
      getEarlyWarningList({
        start_time,
        end_time,
        filter: JSON.stringify(data),
        include_compound,
        include_degradation,
        page,
        search: search || '',
        limit: limit || 1,
      }),
    meta: {
      toastId: 'getEarlyWarningList',
    },
    gcTime: 0,
    staleTime: 0,
  });

  const handleToggleFilter = (key: 'degradation' | 'compound') => {
    setFilter((prev) => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
      page: prev[key] === 'true' ? '1' : prev.page,
    }));
  };

  const [additionalIssuesDomRect, setAdditionalIssuesDomRect] = useState<DOMRect | null>(null);
  const [additionalIssues, setAdditionalIssues] = useState<CurrentIssueType[] | null>(null);

  const selected = filter.selected;

  const earlyWarningCount = useMemo(() => {
    let count = 0;
    if (earlyWarningData) {
      if (include_compound) {
        count += earlyWarningData?.compound_count;
      }
      if (include_degradation) {
        count += earlyWarningData?.degradation_count;
      }
    }
    return count;
  }, [JSON.stringify(earlyWarningData), include_compound, include_degradation]);

  return (
    <Container
      title="Early Warning List"
      icon={<ListAlt width={24} height={24} />}
      className={styles.container}
      background="none"
      contentWrapperProps={{ className: styles.contentWrapper }}
      style={{ flexShrink: 0 }}
      rightTopComponent={
        <div style={{ display: 'flex', alignItems: 'center', flex: '1 0 0' }}>
          <InfoTooltip
            title="Early Warning List"
            content="View and monitor system-generated warnings that may require maintenance actions."
          />
        </div>
      }
    >
      <Loading isLoading={isFetching} />
      <div className={styles.searchRow}>
        <Search
          wrapperClassName={styles.search}
          value={search || ''}
          onChange={(val) => {
            setFilter((prev) => ({
              ...prev,
              search: val,
              page: '1',
            }));
          }}
          placeholder="Search..."
        />
        <FilterButton
          label="Degradation"
          count={earlyWarningData?.degradation_count ?? 0}
          isActive={include_degradation}
          variant="warning"
          onClick={() => handleToggleFilter('degradation')}
        />
        <FilterButton
          label="Compound"
          count={earlyWarningData?.compound_count ?? 0}
          isActive={include_compound}
          variant="critical"
          onClick={() => handleToggleFilter('compound')}
        />
      </div>
      <div className={styles.listContent} ref={setContainer}>
        {earlyWarningData && !isFetching && (
          <FirstDataSelector earlyWarningData={earlyWarningData} selected={selected} />
        )}
        {earlyWarningData?.data?.map((d) => (
          <EarlyWarningCard
            key={d.id}
            data={d}
            isSelected={filter.selected === d.id.toString()}
            onSelect={(id) => {
              setFilter((prev) => ({
                ...prev,
                selected: id,
              }));
            }}
            onShowAdditionalIssues={(boundingRect, issues) => {
              setAdditionalIssuesDomRect(boundingRect);
              setAdditionalIssues(issues);
            }}
          />
        ))}
      </div>
      <div className={styles.pagination}>
        <Pagination
          count={earlyWarningCount}
          limit={limit || 1}
          page={Number(filter.page || '1')}
          onChange={(page) => {
            setFilter((prev) => ({
              ...prev,
              page: String(page),
            }));
          }}
          variant="arrow"
        />
      </div>
      {additionalIssuesDomRect && additionalIssues && (
        <RenderAdditionalIssues
          additionalIssues={additionalIssues}
          additionalIssuesDomRect={additionalIssuesDomRect}
          onClose={() => {
            setAdditionalIssues(null);
            setAdditionalIssuesDomRect(null);
          }}
        />
      )}
    </Container>
  );
};

const RenderAdditionalIssues = ({
  additionalIssuesDomRect,
  additionalIssues,
  onClose,
}: {
  additionalIssuesDomRect: DOMRect;
  additionalIssues: CurrentIssueType[];
  onClose: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, onClose);
  return (
    <div
      className={styles.additionalIssuesPopover}
      style={{
        top: additionalIssuesDomRect?.top,
        left: (additionalIssuesDomRect?.right || 0) + 8,
        borderColor: COLOR.neutralTextTitleHeading,
        background: COLOR.backgroundHighest,
      }}
      ref={containerRef}
    >
      {additionalIssues?.slice(1).map((issue, index) => (
        <div key={index} className={styles.additionalIssueRow}>
          <div>{issue.code}</div>
          <div className={styles.separator} style={{ background: COLOR.neutralTextTitleHeading }} />
          <div className={styles.issueName}>{issue.name}</div>
        </div>
      ))}
    </div>
  );
};

const FirstDataSelector = ({
  earlyWarningData,
  selected,
}: {
  earlyWarningData?: EarlyWarningListResponse;
  selected: string | null;
}) => {
  const { setFilter } = useExtractFilter<GeneralFilterType, EarlyWarningFilterType>();

  useEffect(() => {
    if (earlyWarningData?.data && earlyWarningData?.data.length > 0 && !selected) {
      setFilter((prev) => ({
        ...prev,
        selected: String(earlyWarningData.data![0].id || ''),
      }));
      // console.log(selected);
      // console.log(maintenanceOrderList.data?.data[0].id);
    }
  }, []);

  return null;
};
