import type { Meta, StoryObj } from '@storybook/react';

import { CheckboxIndeterminate } from './checkbox';

const meta: Meta<typeof CheckboxIndeterminate> = {
  component: CheckboxIndeterminate,
  title: 'Form/CheckboxIndeterminate',
};
export default meta;
type Story = StoryObj<typeof CheckboxIndeterminate>;

export const Default: Story = {
  args: {},
};
