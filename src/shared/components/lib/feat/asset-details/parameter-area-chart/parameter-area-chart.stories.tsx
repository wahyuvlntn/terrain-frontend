import { queryClientConfig } from '@digital-twin/utils';
import { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ParameterAreaChart } from './parameter-area-chart';

const meta: Meta<typeof ParameterAreaChart> = {
  component: ParameterAreaChart,
  title: 'Feat/ParameterAreaChart',
};
export default meta;

type Story = StoryObj<typeof ParameterAreaChart>;

const queryClient = new QueryClient(queryClientConfig);

export const Default: Story = {
  args: {
    parameterId: 1,
    unit: '%',
    date: '2023-12-18T17:00:00.000Z',
    parameterName: 'Motor Load',
    onSettingClick: () => alert('Hello world'),
  },
  render: (args) => {
    return (
      <QueryClientProvider client={queryClient}>
        <div style={{ width: '100%', height: 239 }}>
          <ParameterAreaChart {...args} />
        </div>
      </QueryClientProvider>
    );
  },
};
