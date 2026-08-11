import { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';

import { ConditionEnum, StatusEnum } from '../../../mapping';
import { AssetCard } from './asset-card';

const meta: Meta<typeof AssetCard> = {
  component: AssetCard,
  title: 'Feat/AssetCard',
};
export default meta;

type Story = StoryObj<typeof AssetCard>;

export const Default: Story = {
  args: {
    name: 'VMC-008',
    type: 'Vertical Machining Center',
    model: 'FANUC Robodrill 540iD',
    criticalCount: 0,
    warningCount: 0,
    id: 1,
    status: StatusEnum.enum.RUNNING,
    statusStartTime: new Date(),
    condition: ConditionEnum.enum.NORMAL,
    conditionStartTime: new Date(),
    image:
      'https://st.depositphotos.com/2166177/2245/i/450/depositphotos_22451193-stock-photo-cog-wheels.jpg',
  },
  render: (args) => {
    return (
      <BrowserRouter>
        <AssetCard {...args} />
      </BrowserRouter>
    );
  },
};
