import type { Meta, StoryObj } from '@storybook/react';

import { Loading } from './Loading';

const meta: Meta<typeof Loading> = {
  component: Loading,
  title: 'Loading',
};
export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
  args: {
    scale: 0.5,
    delayLoading: 500,
    isLoading: true,
  },
  render: (args) => {
    return (
      <div style={{ width: '1000px', height: '400px', position: 'relative' }}>
        <Loading
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
