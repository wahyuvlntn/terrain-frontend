import clsx from 'clsx';
import { CSSProperties, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Column,
  InfoTooltip,
  Pagination,
  PaginationProps,
  Row,
  Table,
  TooltipContent,
} from '../../../..';
import styles from './recent-list.module.scss';

type SelectorProps = {
  options: {
    id: string;
    icon: ReactNode;
    tooltip: string;
  }[];
  onChange: (id: string) => void;
  value: string;
};

export const Selector = ({ options, onChange, value }: SelectorProps) => {
  return (
    <div className={styles.selector}>
      {options.map((option) => (
        <div key={option.id} className={styles['selector__buttons']}>
          <Button
            onClick={() => onChange(option.id)}
            icon={option.icon}
            className={clsx(value === option.id && styles.selected)}
          />
          <TooltipContent
            title={''}
            className={styles.tooltip}
            content={option.tooltip}
            height={'fit-content'}
            width={'fit-content'}
            contentStyle={{ whiteSpace: 'nowrap' }}
            position={'top-end'}
          />
        </div>
      ))}
    </div>
  );
};

export { Selector as RecentListSelector };

type RecentListProps = {
  icon: ReactNode;
  title: string;
  paginationProps?: Pick<PaginationProps, 'count' | 'searchParamsPrefix'>;
  selectorProps?: SelectorProps;
  style?: CSSProperties;
  informationTooltipContent?: ReactNode;
  data: Row[];
  columns: Column[];
};

export const RecentList = ({
  icon,
  title,
  paginationProps,
  selectorProps,
  style,
  informationTooltipContent,
  data,
  columns,
}: RecentListProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className={styles['recent-list']} style={style}>
      <div className={styles['recent-list__header']}>
        <div className={styles['recent-list__header__title']}>
          {icon}
          <h3>{title}</h3>
          <InfoTooltip title={title} content={informationTooltipContent} />
        </div>
        {selectorProps ? <Selector {...selectorProps} /> : null}
      </div>
      <div className={styles['recent-list__content']}>
        <Table
          hideTitle
          columns={columns.map((item) => ({
            ...item,
            alignment: 'center',
          }))}
          rows={data}
        />
        {paginationProps ? (
          <Pagination
            {...paginationProps}
            variant={'arrow'}
            limit={5}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        ) : null}
      </div>
    </div>
  );
};
