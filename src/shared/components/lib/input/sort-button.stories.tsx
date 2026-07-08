import type { Meta, StoryObj } from '@storybook/react';

import { SortButton } from './sort-button';

const meta: Meta<typeof SortButton> = {
  component: SortButton,
  title: 'Form/SortButton',
};
export default meta;

type Story = StoryObj<typeof SortButton>;

export const Default: Story = {
  args: {
    value: 'ascending',
    label: 'Sort by',
    align: 'left',
    disabled: false,
  },
};
