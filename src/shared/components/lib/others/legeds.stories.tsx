import type { Meta } from '@storybook/react';
import { StoryObj } from '@storybook/react';

import { Legends } from './legends';

type Story = StoryObj<typeof Legends>;

const meta: Meta<typeof Legends> = {
  title: 'Other/Legends',
  component: Legends,
  argTypes: {
    data: {
      control: { type: 'object' },
    },
  },
};

export default meta;

export const Default: Story = {
  args: {
    data: [
      { color: 'red', label: 'Red' },
      { color: 'green', label: 'Green' },
      { color: 'blue', label: 'Blue' },
      { color: 'yellow', label: 'Yellow' },
      { color: 'pink', label: 'Pink' },
    ],
  },
};
