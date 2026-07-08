import { zodResolver } from '@hookform/resolvers/zod';
import { Database,NotificationsFill } from '@digital-twin/icons';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Input } from './input';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Form/Input',
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    backgrounds: {
      default: 'base',
      values: [
        {
          name: 'base',
          value: '#0B2B4B',
        },
        {
          name: 'default',
          value: 'auto',
        },
      ],
    },
  },
  argTypes: {
    value: {
      control: {
        type: 'text',
      },
    },
    label: {
      control: {
        type: 'text',
      },
    },
    placeholder: {
      control: {
        type: 'text',
      },
    },
    align: {
      defaultValue: 'left',
      control: 'inline-radio',
      options: ['left', 'center', 'right'],
    },
    prefix: {
      control: {
        type: 'text',
      },
      description: 'Can be a string or a ReactNode',
    },
    suffix: {
      control: {
        type: 'text',
      },
      description: 'Can be a string or a ReactNode',
    },
    detail: {
      control: {
        type: 'text',
      },
    },
    disabled: {
      control: {
        type: 'boolean',
      },
    },
    readOnly: {
      control: {
        type: 'boolean',
      },
    },
    isError: {
      control: {
        type: 'boolean',
      },
    },

    onOperationClick: {
      defaultValue: () => {},
    },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default = {
  args: {},
};

export const WithLabel = {
  args: {
    label: 'Label',
  },
};

export const WithIcon = {
  args: {
    prefix: <Database />,
    suffix: <NotificationsFill />,
  },
};

export const WithPlaceholder = {
  args: {
    placeholder: 'Placeholder',
  },
};

export const RightAlignedWithSuffix = {
  args: {
    align: 'right',
    value: '100',
    suffix: 'USD',
  },
};

export const WithDetail = {
  args: {
    detail: 'Detail',
  },
};

export const WithError = {
  args: {
    value: '100',
    isError: true,
    detail: 'Error',
  },
};

export const Disabled = {
  args: {
    label: 'Disabled',
    value: '100',
    disabled: true,
  },
};

export const ReadOnly = {
  args: {
    label: 'Read Only',
    value: '100',
    readOnly: true,
  },
};

export const NumberInput = {
  args: {
    label: 'Number Input',
    value: '100',
    type: 'number',
  },
};

export const NumberInputWithOperation = {
  args: {
    label: 'Number Input',
    value: '100',
    type: 'number',
    showOperation: true,
    align: 'center',
  },
};

export const PasswordInput = {
  args: {
    label: 'Password Input',
    value: 'password',
    type: 'password',
  },
};

const checkboxSchema = z.object({
  data: z.string(),
});

export const WithControl: Story = {
  args: {
    label: 'With Control',
    type: 'text',
  },
  render: ({ control: _, registered: __, ...args }) => {
    const { control } = useForm<z.infer<typeof checkboxSchema>>({
      resolver: zodResolver(checkboxSchema),
      defaultValues: {
        data: '',
      },
    });

    return <Input {...args} control={control} registered="data" />;
  },
};
