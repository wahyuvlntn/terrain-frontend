import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ToggleButton } from './toggle-button';

const meta: Meta<typeof ToggleButton> = {
  component: ToggleButton,
  title: 'ToggleButton',
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

const toggleSchema = z.object({
  data: z.boolean(),
});

export const Default: Story = {
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const { control } = useForm<z.infer<typeof toggleSchema>>({
      resolver: zodResolver(toggleSchema),
      defaultValues: {
        data: false,
      },
    });

    return (
      <ToggleButton registered={'data'} control={control} label={args.label} />
    );
  },
};
