import type { Meta } from '@storybook/react';
import { StoryObj } from '@storybook/react';

import { Button } from '../input';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './popover';

type Story = StoryObj<typeof Popover>;

const meta: Meta<typeof Popover> = {
  title: 'Other/Popover',
  component: Popover,
  argTypes: {
    placement: {
      options: [
        'auto-start',
        'auto',
        'auto-end',
        'top-start',
        'top',
        'top-end',
        'right-start',
        'right',
        'right-end',
        'bottom-end',
        'bottom',
        'bottom-start',
        'left-end',
        'left',
        'left-start',
      ],
      control: { type: 'inline-radio' },
    },
  },
};

export default meta;

export const Default: Story = {
  render: (args) => {
    return (
      <Popover {...args}>
        <PopoverTrigger
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Button variant="contained">My trigger</Button>
        </PopoverTrigger>
        <PopoverContent className="Popover">
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Maxime
            fugit dolor, repudiandae suscipit quisquam quidem fuga! In id dolore
            nemo mollitia tempora ratione aliquam voluptate at impedit earum
            natus et possimus ullam velit, provident architecto atque, nobis
            debitis modi. Et quidem iste ipsa non id assumenda commodi,
            veritatis eius incidunt.
          </p>
          <PopoverClose>Close</PopoverClose>
        </PopoverContent>
      </Popover>
    );
  },
  args: {
    placement: 'right-end',
  },
};
