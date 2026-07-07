import { NotificationsFill } from '@digital-twin/icons';
import type { Meta } from '@storybook/react';

import { Button } from './button';

const meta: Meta<typeof Button> = {
  component: Button,
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
      options: ['contained', 'text'],
      control: { type: 'inline-radio' },
    },
    disabled: {
      type: 'boolean',
      control: { type: 'boolean' },
    },
    isLoading: {
      type: 'boolean',
      control: { type: 'boolean' },
    },
  },
  title: 'Form/Button',
};
export default meta;

export const Default = {
  args: {
    children: 'Button',
    color: 'primary',
    variant: 'contained',
  },
};

export const WithIcon = {
  args: {
    children: 'Button',
    icon: <NotificationsFill />,
    color: 'primary',
    variant: 'contained',
  },
};

export const IconButton = {
  args: {
    icon: <NotificationsFill />,
    color: 'primary',
    variant: 'contained',
  },
};
