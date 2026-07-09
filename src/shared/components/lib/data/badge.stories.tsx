import { Database,NotificationsFill } from '@digital-twin/icons';
import type { Meta } from '@storybook/react';

import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  argTypes: {
    color: {
      type: 'string',
      options: [
        'primary',
        'primary-alt',
        'success',
        'success-alt',
        'warning',
        'warning-alt',
        'error',
        'error-alt',
      ],
      control: { type: 'inline-radio' },
    },
    variant: {
      type: 'string',
      options: ['pill', 'rounded'],
      control: { type: 'inline-radio' },
    },
  },
  title: 'Other/Badge',
};
export default meta;

export const Default = {
  args: {
    children: 'Badge',
    color: 'primary',
    variant: 'rounded',
  },
};

export const WithIcon = {
  args: {
    children: 'Badge',
    leftIcon: <Database />,
    rightIcon: <NotificationsFill />,
    color: 'primary',
    variant: 'rounded',
  },
};

export const CustomColor = {
  args: {
    children: 'Badge',
    style: { backgroundColor: 'pink', color: 'red' },
    variant: 'rounded',
  },
};
