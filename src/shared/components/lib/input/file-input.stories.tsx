import { zodResolver } from '@hookform/resolvers/zod';
import { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from './button';
import { FileInput } from './file-input';

const meta: Meta<typeof FileInput> = {
  component: FileInput,
  title: 'File Input',
};
export default meta;
type Story = StoryObj<typeof FileInput>;

const fileInputSchema = z.object({
  file: z
    .instanceof(File)
    .optional()
    .refine((file) => (file?.size ?? 0) < 1024 * 1024, 'Max size is 1 MB'),
});

export const ReactHookForm: Story = {
  args: {
    accept: 'image/png, image/jpeg',
    label: 'Image',
  },
  render: (args) => {
    const { control, handleSubmit } = useForm<z.infer<typeof fileInputSchema>>({
      resolver: zodResolver(fileInputSchema),
    });

    const onSubmit = handleSubmit(
      (data) => console.log({ data }),
      (errors) => console.log({ errors })
    );

    return (
      <form onSubmit={onSubmit}>
        <FileInput {...args} control={control} registered={'file'} />
        <Button>Submit (not a part of the FileInput)</Button>
      </form>
    );
  },
};

export const Basic: Story = {
  args: {
    accept: 'image/png, image/jpeg',
    label: 'Image',
  },
  render: (args) => {
    return <FileInput {...args} />;
  },
};
