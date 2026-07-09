import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Table } from './table';

const meta: Meta<typeof Table> = {
  component: Table,
  title: 'Table',
};
export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  args: {
    width: '100%',
    columns: [
      { name: 'Col A', key: 'colA', alignment: 'right', width: 100 },
      { name: 'Col B', key: 'colB', alignment: 'center', width: 200 },
      { name: 'Col C', key: 'colC' },
    ],
    rows: [
      { id: '1', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '2', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '3', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '4', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '5', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '6', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
      { id: '7', colA: 'Row 1 A', colB: 'Row 1 B', colC: 'Row 1 C' },
    ],
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

    const handleSelectRow = (rowId: string, selected: boolean) => {
      if (selected && selectedRowIds.includes(rowId)) return;
      if (!selected && !selectedRowIds.includes(rowId)) return;

      if (selected) setSelectedRowIds((prev) => [...prev, rowId]);
      if (!selected)
        setSelectedRowIds((prev) => [...prev.filter((item) => item !== rowId)]);
    };

    const handleSelectAll = (selectAll: boolean) => {
      if (selectAll) setSelectedRowIds(args.rows.map((row) => row.id));
      else setSelectedRowIds([]);
    };

    return (
      <Table
        {...args}
        onSelectRow={handleSelectRow}
        selectedRowIds={selectedRowIds}
        onSelectAllClick={handleSelectAll}
      />
    );
  },
};
