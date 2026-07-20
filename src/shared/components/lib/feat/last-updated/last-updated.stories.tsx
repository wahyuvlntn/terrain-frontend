import { queryClientConfig } from '@digital-twin/utils';
import { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LastUpdated } from './last-updated';

const meta: Meta<typeof LastUpdated> = {
  component: LastUpdated,
  title: 'Feat/LastUpdated',
};
export default meta;

type Story = StoryObj<typeof LastUpdated>;

const queryClient = new QueryClient(queryClientConfig);

export const Default: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <LastUpdated />
    </QueryClientProvider>
  ),
};
