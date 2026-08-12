import { queryClientConfig } from '@digital-twin/utils';
import { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../../input';
import { ParameterSetupDrawer } from './parameter-setup-drawer';

const meta: Meta<typeof ParameterSetupDrawer> = {
  component: ParameterSetupDrawer,
  title: 'Feat/ParameterSetupDrawer',
};
export default meta;

type Story = StoryObj<typeof ParameterSetupDrawer>;

const queryClient = new QueryClient(queryClientConfig);

export const Default: Story = {
  args: {
    parameterId: 1,
    parameterName: 'Spindle Load',
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    return (
      <QueryClientProvider client={queryClient}>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <ParameterSetupDrawer
          onClose={() => setOpen(false)}
          open={open}
          parameterId={args.parameterId}
          parameterName={args.parameterName}
        />
      </QueryClientProvider>
    );
  },
};
