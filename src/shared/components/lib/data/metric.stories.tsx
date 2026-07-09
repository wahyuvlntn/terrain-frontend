import { CarbonOutfit } from '@digital-twin/icons';
import type { Meta, StoryObj } from '@storybook/react';

import { COLOR } from '../color';
import { Metric } from './metric';

const meta: Meta<typeof Metric> = {
  component: Metric,
  title: 'Metric',
};
export default meta;
type Story = StoryObj<typeof Metric>;

export const Default: Story = {
  args: {
    title: 'Total CO₂ Emission',
    value: 112,
    unit: 'Ton',
    borderColor: COLOR.conditionCriticalPrimary,
    icon: <CarbonOutfit />,
  },
};
