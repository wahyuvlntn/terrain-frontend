import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Pagination } from './pagination';

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  title: 'Pagination',
};
export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: { page: 1, limit: 5, count: 33 },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [page, setPage] = useState(args.page);
    return <Pagination {...args} page={page} onChange={setPage} />;
  },
};
