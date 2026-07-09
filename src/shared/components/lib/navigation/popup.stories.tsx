import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../input';
import { Popup } from './popup';

const meta: Meta<typeof Popup> = {
  component: Popup,
  title: 'Popup',
};
export default meta;
type Story = StoryObj<typeof Popup>;

export const Default: Story = {
  args: {
    title: 'Popup Title',
    variant: 'none',
    background: 'dark',
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Popup
          title={args.title}
          icon={<div />}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={() => {}}
          variant={args.variant}
          background={args.background}
        >
          <div style={{ padding: 10 }}>This is the popup's content</div>
        </Popup>
      </>
    );
  },
};
