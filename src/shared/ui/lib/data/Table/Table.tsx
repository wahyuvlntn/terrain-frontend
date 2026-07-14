import {
  CSSProperties,
  MouseEventHandler,
  ReactNode,
  RefObject,
  UIEventHandler,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { default as AscendingV2Icon } from '../../icons/AscendingV2Icon';
import { default as DescendingV2Icon } from '../../icons/DescendingV2Icon';
import { default as OrderNoneIcon } from '../../icons/OrderNoneIcon';
import { Checkbox } from '../../input/Checkbox/Checkbox';
import { cn } from '../../utils';

export type TableData = Record<string, ReactNode>;

export interface TableRow<T extends TableData = TableData> {
  id: string;
  data: T;
  /**
   * If given, overrides the default onClick handler. This causes onSelect from clicking the row to not be triggered.
   */
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  onDoubleClick?: MouseEventHandler<HTMLTableRowElement>;
  onContextMenu?: MouseEventHandler<HTMLTableRowElement>;
}

export interface TableColumn<T extends TableData = TableData> {
  field: Extract<keyof T, string>;
  header?: ReactNode;
  width?: string | number;
  alignment?: 'left' | 'right' | 'center';
}

export interface TableOrder<T extends TableData = TableData> {
  field: Extract<keyof T, string>;
  order: boolean | null;
}

interface TableProps<T extends TableData = TableData> {
  columns?: TableColumn<T>[];
  rows?: TableRow<T>[];

  selectable?: boolean;
  selecteds?: string[] | Record<string, unknown>;

  /**
   * This callback is invoked when clicking the checkbox or clicking the row.
   * If the row is given an onClick prop, onSelect will only be invoked when clicking the checkbox.
   */
  onSelect?: (data: TableRow<T>, selected: boolean) => void;

  useCheckbox?: boolean;
  useCheckAll?: boolean;
  checkAll?: boolean | null;
  onCheckAll?: (checkAll: boolean) => void;

  orders?: TableOrder<T>[] | Record<string, boolean | null>;
  onOrderChange?: (field: Extract<keyof T, string>, order: boolean | null) => void;

  width?: string | number;
  height?: string | number;
  headerHeight?: string | number;
  rowHeight?: string | number;

  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  wrapperRef?: RefObject<HTMLDivElement> | ((instance: HTMLDivElement | null) => void);
  wrapperOnScroll?: UIEventHandler<HTMLDivElement>;

  tone?: 'simple' | 'zebra';
}

interface TableRowComponentProps<T extends TableData = TableData> {
  selectable?: boolean;
  isSelected: boolean;
  isZebra: boolean;
  isEvenRow: boolean;
  isLastRow: boolean;
  useCheckbox?: boolean;
  rowHeight?: string | number;
  tone?: 'simple' | 'zebra';
  columns: TableColumn<T>[];
  data: T;
  id: string;
  row: TableRow<T>;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  onDoubleClick?: MouseEventHandler<HTMLTableRowElement>;
  onContextMenu?: MouseEventHandler<HTMLTableRowElement>;
  onSelect?: (data: TableRow<T>, selected: boolean) => void;
}

const TableRowComponent = <T extends TableData = TableData>({
  selectable,
  isSelected,
  isZebra,
  isEvenRow,
  isLastRow,
  useCheckbox,
  rowHeight,
  tone,
  columns,
  data,
  id,
  row,
  onClick,
  onDoubleClick,
  onContextMenu,
  onSelect,
}: TableRowComponentProps<T>) => {
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick: MouseEventHandler<HTMLTableRowElement> = useCallback(
    (e) => {
      if (onDoubleClick) {
        e.stopPropagation();
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
          if (onClick) {
            onClick(e);
          } else {
            e.stopPropagation();
            selectable && onSelect && onSelect(row, !isSelected);
          }

          clickTimeoutRef.current = null;
        }, 250);
      } else {
        if (onClick) {
          onClick(e);
        } else {
          e.stopPropagation();
          selectable && onSelect && onSelect(row, !isSelected);
        }
      }
    },
    [onClick, onDoubleClick, selectable, onSelect, row, isSelected]
  );

  const handleDoubleClick: MouseEventHandler<HTMLTableRowElement> = useCallback(
    (e) => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      onDoubleClick?.(e);
    },
    [onDoubleClick]
  );

  return (
    <tr
      className={cn(
        'align-middle last:rounded-b-lg',
        selectable && 'cursor-pointer group',
        !useCheckbox &&
          isSelected &&
          'outline-2 outline-(--afdd-brand-surface-default-primary) -outline-offset-2'
      )}
      onClick={handleClick}
      onDoubleClick={onDoubleClick ? handleDoubleClick : undefined}
      onContextMenu={onContextMenu}
    >
      {useCheckbox ? (
        <td
          className={cn(
            'border-0 border-solid border-(--afdd-border-default) text-center overflow-hidden text-ellipsis whitespace-nowrap box-border align-middle text-sm font-normal bg-(--afdd-background-low) h-10',
            tone !== 'zebra' && !isLastRow && 'border-b',
            selectable && 'group-hover:bg-(--afdd-background-default)',
            isZebra && isEvenRow && 'bg-(--afdd-background-lowest)',
            isSelected && 'bg-(--afdd-background-default)!'
          )}
          style={{
            width: 0,
            maxWidth: 0,
            padding: '0 1.5rem',
            height: rowHeight,
          }}
        >
          <div className={cn('flex justify-center items-center gap-1.5 h-full')}>
            <Checkbox
              checked={isSelected}
              onChange={() => {
                onSelect && onSelect(row, !isSelected);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </td>
      ) : null}
      {columns.map(({ field, alignment, width }) => {
        const value = data[field];
        // const isLast = colIndex === columns.length - 1;

        return (
          <td
            key={`${id}__${field}`}
            className={cn(
              // cells wrap (up to 4 lines, see below) instead of forcing one line and a wide table
              'px-2 py-1.5 border-0 border-solid border-(--afdd-border-default) text-center overflow-hidden box-border align-middle text-sm font-normal bg-(--afdd-background-low) h-10',
              !isZebra && !isLastRow && 'border-b',
              selectable && 'group-hover:bg-(--afdd-background-default)',
              isZebra && isEvenRow && 'bg-(--afdd-background-lowest)',
              isSelected && 'bg-(--afdd-background-default)!'
            )}
            style={{
              width: width,
              maxWidth: width,
              height: rowHeight,
            }}
          >
            <div
              className={cn(
                'flex justify-center items-center gap-1.5 h-full',
                isSelected && 'bg-(--afdd-background-default)',
                alignment === 'left' && 'justify-start',
                alignment === 'right' && 'justify-end'
              )}
              title={
                typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
              }
            >
              {typeof value === 'string' || typeof value === 'number' ? (
                // at most 4 lines, then an ellipsis; the full text is the cell's title (hover)
                <span className="line-clamp-4 break-words whitespace-normal">{value}</span>
              ) : (
                value
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
};

export const Table = <T extends TableData = TableData>({
  columns,
  rows,

  selectable = true,
  selecteds,
  onSelect,

  useCheckbox,
  useCheckAll = true,
  checkAll,
  onCheckAll,

  orders,
  onOrderChange,

  width,
  height,
  headerHeight,
  rowHeight,

  wrapperStyle,
  wrapperClassName,
  wrapperRef,
  wrapperOnScroll,

  tone,
}: TableProps<T>) => {
  const emptyRows = !rows || rows.length === 0;

  const selectedsMap = useMemo(() => {
    let records: Record<string, unknown>;

    if (!selectable) {
      return {};
    }

    if (Array.isArray(selecteds)) {
      records = {};
      for (const id of selecteds) {
        records[id] = undefined;
      }
    } else if (selecteds) {
      records = selecteds;
    } else {
      records = {};
    }

    return records;
  }, [selectable, selecteds]);

  const ordersMap = useMemo(() => {
    let records: Record<string, boolean | null>;

    if (Array.isArray(orders)) {
      records = {};
      for (const { field, order } of orders) {
        records[field] = order;
      }
    } else if (orders) {
      records = orders;
    } else {
      records = {};
    }

    return records;
  }, [orders]);

  const renderedColumns = useMemo(() => {
    if (!columns) {
      return null;
    }

    return columns.map(({ field, header, width, alignment }) => {
      const fieldStr = field.toString();
      const order = field in ordersMap ? ordersMap[fieldStr] : undefined;
      const isZebra = tone === 'zebra';
      // const isFirst = colIndex === 0 && !useCheckbox;
      // const isLast = colIndex === columns.length - 1;

      return (
        <th
          key={field}
          className={cn(
            'text-base font-medium bg-(--afdd-background-lowest) px-3 py-2 sticky top-0 h-11 border-0 border-solid border-(--afdd-border-default) text-center overflow-hidden text-ellipsis whitespace-nowrap box-border align-middle',
            isZebra && !emptyRows ? 'border-b-(--afdd-background-lowest)' : 'border-b'
          )}
          style={{
            width: width,
            maxWidth: width,
            height: headerHeight,
          }}
        >
          <div
            className={cn(
              'flex justify-center items-center gap-1.5 h-full',
              alignment === 'left' && 'justify-start',
              alignment === 'right' && 'justify-end'
            )}
            title={typeof header === 'string' ? header : field}
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {header ?? field}
            </span>
            {order !== undefined ? (
              <div
                className="cursor-pointer shrink-0 flex justify-center items-center w-5 h-5"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextOrder = order === true ? false : order === false ? null : true; // true > false > null > true > ...
                  onOrderChange && onOrderChange(field, nextOrder);
                }}
              >
                {order === null ? (
                  <OrderNoneIcon />
                ) : order ? (
                  <AscendingV2Icon />
                ) : (
                  <DescendingV2Icon />
                )}
              </div>
            ) : null}
          </div>
        </th>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, ordersMap, headerHeight, tone, emptyRows, useCheckbox]);

  const renderedRows = useMemo(() => {
    if (!columns || !rows) {
      return null;
    }

    return rows.map((row, rowIndex) => {
      const { id, data, onClick, onDoubleClick, onContextMenu } = row;
      const isSelected = id in selectedsMap;
      const isZebra = tone === 'zebra';
      const isEvenRow = rowIndex % 2 === 1;

      return (
        <TableRowComponent
          key={id}
          selectable={selectable}
          isSelected={isSelected}
          isZebra={isZebra}
          isEvenRow={isEvenRow}
          isLastRow={rowIndex === rows.length - 1}
          useCheckbox={useCheckbox}
          rowHeight={rowHeight}
          tone={tone}
          columns={columns}
          data={data}
          id={id}
          row={row}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          onSelect={onSelect}
        />
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rows, selectedsMap, useCheckbox, rowHeight, tone, selectable]);

  // remove h-full
  return (
    <div
      className={cn(
        'w-full text-base text-(--afdd-neutral-text-title-heading) rounded-lg overflow-auto border border-solid border-(--afdd-border-default)',
        wrapperClassName
      )}
      style={{ width, height, ...wrapperStyle }}
      ref={wrapperRef}
      onScroll={wrapperOnScroll}
    >
      <table className="w-full border-spacing-0 rounded-lg">
        <tbody>{renderedRows}</tbody>
        <tfoot />
        <thead>
          <tr className="align-middle">
            {useCheckbox ? (
              <th
                style={{ width: 0, maxWidth: 0, padding: '0 1.5rem' }}
                className={cn(
                  'text-base font-medium bg-(--afdd-background-lowest) sticky top-0 h-11 border-0 border-solid border-(--afdd-border-default) text-center overflow-hidden text-ellipsis whitespace-nowrap box-border align-middle',
                  tone === 'zebra' && !emptyRows
                    ? 'border-b-(--afdd-background-lowest)'
                    : 'border-b'
                )}
              >
                {useCheckAll ? (
                  <div className="flex justify-center items-center gap-1.5 h-full">
                    <Checkbox
                      checked={!!checkAll}
                      indeterminate={checkAll === null}
                      onChange={() => {
                        const nextCheckAll = !(checkAll === true || checkAll === null); // true | null > false, false > true
                        onCheckAll && onCheckAll(nextCheckAll);
                      }}
                    />
                  </div>
                ) : null}
              </th>
            ) : null}
            {renderedColumns}
          </tr>
        </thead>
      </table>
    </div>
  );
};
