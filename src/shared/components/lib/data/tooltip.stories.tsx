import type { Meta, StoryObj } from '@storybook/react';

import { InfoTooltip } from './tooltip';

const meta: Meta<typeof InfoTooltip> = {
  component: InfoTooltip,
  title: 'Tooltip',
};

export default meta;
type Story = StoryObj<typeof InfoTooltip>;

export const Default: Story = {};
