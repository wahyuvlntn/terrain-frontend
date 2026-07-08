import { zodResolver } from '@hookform/resolvers/zod';
import { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DateTimePicker } from './datetimepicker';

const meta: Meta<typeof DateTimePicker> = {
  component: DateTimePicker,
  title: 'Form/DateTimePicker',
};
export default meta;

const dateSchema = z.object({
  data: z.string(),
});

type Story = StoryObj<typeof DateTimePicker<z.infer<typeof dateSchema>>>;

export const Default: Story = {
  args: { value: '2023-12-12', width: 153, type: 'date' },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const { control } = useForm<z.infer<typeof dateSchema>>({
      resolver: zodResolver(dateSchema),
      defaultValues: {
        data: args.value,
      },
    });

    return (
      <DateTimePicker
        registered={'data'}
        control={control}
        {...args}
        label={args.label}
      />
    );
  },
};

export const TimePicker: Story = {
  args: { value: '09:00', width: 153, type: 'time' },
  render: (args) => {
    //eslint-disable-next-line react-hooks/rules-of-hooks
    const { control } = useForm<z.infer<typeof dateSchema>>({
      resolver: zodResolver(dateSchema),
      defaultValues: {
        data: args.value,
      },
    });

    return (
      <DateTimePicker
        registered={'data'}
        control={control}
        {...args}
        label={args.label}
      />
    );
  },
};

