import type { Meta } from '@storybook/react';
import { StoryObj } from '@storybook/react';
import { useState } from 'react';

import { DropdownMultiple } from './dropdown--multiple';

interface Option {
  label: string;
  value: string;
}

type Story = StoryObj<typeof DropdownMultiple<Option>>;

const meta: Meta<typeof DropdownMultiple> = {
  component: DropdownMultiple,
  title: 'Form/DropdownMultiple',
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
        type: 'array',
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
  },
};
export default meta;

export const Default: Story = {
  args: {
    label: 'Label',
    // value: { label: 'Afghanistan', value: 'afghanistan' },
    value: ['afghanistan'],
    options: [
      { label: 'Afghanistan', value: 'afghanistan' },
      { label: 'Albania', value: 'albania' },
      { label: 'Algeria', value: 'algeria' },
    ],
  },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<string[]>(args.value || []);
    return (
      <DropdownMultiple
        {...args}
        value={value}
        onChange={setValue}
        label={args.label}
        options={args.options}
      />
    );
  },
};
