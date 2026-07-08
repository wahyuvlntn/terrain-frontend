import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';

import { Search } from './search';

const meta: Meta<typeof Search> = {
  component: Search,
  title: 'Form/Search',
};
export default meta;
type Story = StoryObj<typeof Search>;

export const Default: Story = {
  args: {
    timeoutMs: 500,
    placeholder: 'Search Asset...',
  },
  render: (args) => {
    return (
      <BrowserRouter>
        <Search {...args} />
      </BrowserRouter>
    );
  },
};
