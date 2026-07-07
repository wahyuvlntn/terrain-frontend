import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Checkbox } from './checkbox';

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
  title: 'Form/Checkbox',
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

const checkboxSchema = z.object({
  data: z.boolean(),
});

export const Default: Story = {
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const { control } = useForm<z.infer<typeof checkboxSchema>>({
      resolver: zodResolver(checkboxSchema),
      defaultValues: {
        data: false,
      },
    });
    return (
      <Checkbox
        registered={'data'}
        control={control}
        label={args.label}
      />
    );
  },
};
