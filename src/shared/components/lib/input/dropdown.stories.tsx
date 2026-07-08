import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta } from '@storybook/react';
import { StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Dropdown } from './dropdown';

interface Option {
  label: string;
  value: string;
}

type Story = StoryObj<typeof Dropdown<Option>>;

const meta: Meta<typeof Dropdown> = {
  component: Dropdown,
  title: 'Form/Dropdown',
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
    options: {
      control: 'array',
      desfaultValue: [
        { label: 'Afghanistan', value: 'afghanistan' },
        { label: 'Albania', value: 'albania' },
        { label: 'Algeria', value: 'algeria' },
      ],
    },
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
    labelPosition: {
      control: {
        defaultValue: 'top',
        control: 'inline-radio',
        options: ['left', 'top'],
      },
    },
    isLoading: {
      control: {
        type: 'boolean',
      },
    },
  },
};
export default meta;

const dropdownSchema = z.object({
  data: z.coerce.string(),
});

export const Default: Story = {
  args: {
    label: 'Label',
    // value: { label: 'Afghanistan', value: 'afghanistan' },
    value: 'afghanistan',
    options: [
      { label: 'Afghanistan', value: 'afghanistan' },
      { label: 'Albania', value: 'albania' },
      { label: 'Algeria', value: 'algeria' },
    ],
    labelPosition: 'top',
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const { control } = useForm<z.infer<typeof dropdownSchema>>({
      resolver: zodResolver(dropdownSchema),
      defaultValues: {
        data: args.value || 'afghanistan',
      },
    });
    return (
      <Dropdown
        {...args}
        label={args.label}
        options={args.options}
        control={control}
        registered={'data'}
        labelPosition={args.labelPosition}
      />
    );
  },
};
