import type { Meta } from '@storybook/react';

import { TextBox } from './textbox';

const meta: Meta<typeof TextBox> = {
  component: TextBox,
  title: 'Form/TextBox',
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
    rows: {
      defaultValue: 3,
      control: {
        type: 'number',
      },
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
  },
};
export default meta;

export const Default = {
  args: {},
};

export const WithLabel = {
  args: {
    label: 'Label',
  },
};

export const WithPlaceholder = {
  args: {
    placeholder: 'Placeholder',
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
