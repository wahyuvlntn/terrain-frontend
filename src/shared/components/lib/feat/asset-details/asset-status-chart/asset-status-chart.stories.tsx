import { Meta, StoryObj } from '@storybook/react';

import { ConditionEnum, StatusEnum } from '../../../mapping';
import { AssetStatusChart } from './asset-status-chart';

const meta: Meta<typeof AssetStatusChart> = {
  component: AssetStatusChart,
  title: 'Feat/AssetStatusChart',
};
export default meta;

type Story = StoryObj<typeof AssetStatusChart>;

export const Default: Story = {
  args: {
    status: [
      {
        start: '2023-12-18T17:00:00.000Z',
        end: '2023-12-19T11:20:00.000Z',
        value: StatusEnum.enum.RUNNING,
      },
      {
        start: '2023-12-19T11:20:00.000Z',
        end: '2023-12-19T13:05:00.000Z',
        value: StatusEnum.enum.IDLE,
      },
      {
        start: '2023-12-19T13:05:00.000Z',
        end: '2023-12-19T14:30:00.000Z',
        value: StatusEnum.enum.DOWN,
      },
      {
        start: '2023-12-19T14:30:00.000Z',
        end: '2023-12-19T17:00:00.000Z',
        value: StatusEnum.enum.OFFLINE,
      },
    ],
    conditions: [
      {
        start: '2023-12-18T17:00:00.000Z',
        end: '2023-12-19T11:20:00.000Z',
        value: ConditionEnum.enum.NORMAL,
      },
      {
        start: '2023-12-19T11:20:00.000Z',
        end: '2023-12-19T13:05:00.000Z',
        value: ConditionEnum.enum.WARNING,
      },
      {
        start: '2023-12-19T13:05:00.000Z',
        end: '2023-12-19T14:30:00.000Z',
        value: ConditionEnum.enum.CRITICAL,
      },
    ],
    from: '2023-12-18T17:00:00.000Z',
    to: '2023-12-19T17:00:00.000Z',
  },
};
