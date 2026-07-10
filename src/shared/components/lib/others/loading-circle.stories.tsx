import type { Meta, StoryObj } from '@storybook/react';

import { LoadingCircle } from './Loading-circle';

const meta: Meta<typeof LoadingCircle> = {
  component: LoadingCircle,
  title: 'Loading Circle',
};
export default meta;
type Story = StoryObj<typeof LoadingCircle>;

export const Default: Story = {
  args: {
    scale: 0.5,
    delayLoading: 0,
    isLoading: true,
  },
  render: (args) => {
    return (
      <div style={{ width: '1000px', height: '400px', position: 'relative' }}>
        <LoadingCircle
          isLoading={args.isLoading}
          delayLoading={args.delayLoading}
          scale={args.scale}
        />
        <div>
          Lorem Ipsum is simply dummy text of the printing and typesetting
          industry. Lorem Ipsum has been the industry's standard dummy text ever
          since the 1500s, when an unknown printer took a galley of type and
          scrambled it to make a type specimen book. It has survived not only
          five centuries, but also the leap into electronic typesetting,
          remaining essentially unchanged. It was popularised in the 1960s with
          the release of Letraset sheets containing Lorem Ipsum passages, and
          more recently with desktop publishing software like Aldus PageMaker
          including versions of Lorem Ipsum.
        </div>
      </div>
    );
  },
};
