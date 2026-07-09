import {
  Table as TableReusable,
  TableColumn,
  TableRow,
} from '@digital-twin/reusables';
import { CSSProperties, ReactNode, useMemo } from 'react';

export interface Column {
  key: string;
  name: ReactNode;
  width?: string | number;
  alignment?: 'left' | 'right' | 'center';
  sortState?: boolean;
  showOrderIcon?: boolean;
}

export interface Row {
  id: string;
  [key: string]: ReactNode;
}

interface TableProps {
  columns: Column[];
  rows: Row[];
  selectable?: boolean;
  selectedRowIds?: string[];
  sortable?: boolean;
  checkedAll?: boolean;
  onSelectAllClick?: (selectAll: boolean) => void;
  onSelectRow?: (rowId: string, selected: boolean) => void;
  handleSortColumn?: (columnKey: string, sort: boolean | undefined) => void;
  selectVariant?: 'checkbox' | 'highlight';
  hideTitle?: boolean; // Ignored
  width?: string | number;
  height?: string | number;
  headerHeight?: string | number;
  rowHeight?: string | number;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
}

export const Table = ({
  rows,
  selectable,
  selectedRowIds,
  columns,
  sortable,
  checkedAll,
  onSelectAllClick,
  onSelectRow,
  handleSortColumn,
  selectVariant = 'checkbox',
  ...props
}: TableProps) => {
  const isAllSelected =
    selectable &&
    selectedRowIds &&
    (checkedAll !== undefined
      ? checkedAll
      : selectedRowIds.length >= rows.length);
  const isAllUnselected = selectable && selectedRowIds?.length === 0;
  const isPartialSelected = !isAllSelected && !isAllUnselected;

  const { normalizedColumns, orders } = useMemo(() => {
    const normalizedColumns: TableColumn<Row>[] = [];
    const orders: Record<string, boolean | null> = {};

    for (const column of columns) {
      const { key, name, width, alignment, showOrderIcon, sortState } = column;

      normalizedColumns.push({
        field: key,
        header: name,
        width,
        alignment: alignment ?? 'left',
      });

      if (sortable && showOrderIcon) {
        orders[key] = sortState === undefined ? null : sortState;
      }
    }

    return { normalizedColumns, orders };
  }, [columns, sortable]);

  const normalizedRows: TableRow<Row>[] = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        data: row,
      })),
    [rows]
  );

  return (
    <TableReusable
      columns={normalizedColumns}
      rows={normalizedRows}
      selectable={selectable ?? false}
      selecteds={selectable ? selectedRowIds : undefined}
      onSelect={({ id }, selected) => {
        onSelectRow && onSelectRow(id, selected);
      }}
      useCheckbox={selectVariant !== 'highlight' && selectable}
      checkAll={isPartialSelected ? null : isAllSelected && !isAllUnselected}
      onCheckAll={onSelectAllClick}
      orders={orders}
      onOrderChange={(field, order) => {
        handleSortColumn &&
          handleSortColumn(field, order === null ? undefined : order);
      }}
      tone="simple"
      {...props}
    />
  );
};
