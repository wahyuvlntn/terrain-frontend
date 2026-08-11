import { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';

import { AlarmEnum } from '../../../mapping';
import { AlarmItem } from './alarm-item';

const meta: Meta<typeof AlarmItem> = {
  component: AlarmItem,
  title: 'Feat/AlarmItem',
};
export default meta;

type Story = StoryObj<typeof AlarmItem>;

export const Default: Story = {
  args: {
    message: 'Joint position error (Axis 1, 2, & 3)',
    severity: AlarmEnum.enum.WARNING,
    timestamp: new Date(),
    navData: {
      asset: 1,
      assetType: 1,
      cell: 1,
      plant: 1,
      site: 1,
      assetModel: 1,
    },
  },
  render: (args) => (
    <BrowserRouter>
      <AlarmItem {...args} />
    </BrowserRouter>
  ),
};
