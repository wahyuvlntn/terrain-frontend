import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../input';
import { Drawer } from './drawer';

const meta: Meta<typeof Drawer> = {
  component: Drawer,
  title: 'Drawer',
};
export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  args: {
    title: 'Parameter Setup',
    variant: 'save',
    background: 'dark',
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Drawer
          title={args.title}
          icon={<div />}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={() => {}}
          variant={args.variant}
          background={args.background}
        />
      </>
    );
  },
};
