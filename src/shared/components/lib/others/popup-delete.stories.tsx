import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../input';
import { PopupDelete } from './popup-delete';

const meta: Meta<typeof PopupDelete> = {
  component: PopupDelete,
  title: 'Popup Delete',
};
export default meta;
type Story = StoryObj<typeof PopupDelete>;

export const Default: Story = {
  args: {
    entityType: 'Item',
    entityName: 'Item 1',
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <PopupDelete
          entityType={args.entityType}
          entityName={args.entityName}
          open={open}
          onClose={() => setOpen(false)}
          onDelete={() => {}}
          deleting={false}
        />
      </>
    );
  },
};
