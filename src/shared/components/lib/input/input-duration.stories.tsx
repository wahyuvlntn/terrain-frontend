import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { InputDuration } from './input-duration';

const meta: Meta<typeof InputDuration> = {
  component: InputDuration,
  title: 'InputDuration',
};
export default meta;
type Story = StoryObj<typeof InputDuration>;

export const Default: Story = {
  args: {
    location: 'left',
  },
  render: (args) => {
    const [filter, setFilter] = useState<{
      startDate: Date | undefined;
      endDate: Date | undefined;
    }>({
      startDate: undefined,
      endDate: undefined,
    });
    return (
      <InputDuration
        {...{
          startDate: filter.startDate,
          endDate: filter.endDate,
          maxDate: new Date(),
          location: args.location,
          onChange: (start, end) =>
            setFilter({
              startDate: start,
              endDate: end,
            }),
          //TODO: remove onInitRender since it's not used
          // onInitRender: (start, end) =>
          //   setFilter({
          //     startDate: start,
          //     endDate: end,
          //   }),
        }}
      />
    );
  },
};
