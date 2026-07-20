import { ChartAreaTimeline } from '@digital-twin/icons';
import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from '../data';
import { Container } from './container';

const meta: Meta<typeof Container> = {
  component: Container,
  title: 'Container',
};
export default meta;
type Story = StoryObj<typeof Container>;

export const Default: Story = {
  args: {},
  render: () => (
    <div style={{ width: '100%', display: 'flex', height: '100%', gap: 10 }}>
      <Container
        title={'Container Title'}
        icon={<ChartAreaTimeline />}
        rightTopComponent={<Badge>Hello world</Badge>}
        style={{
          width: '100%',
        }}
      >
        <div>Hello World</div>
      </Container>
      <Container title={'Container Title'} icon={<ChartAreaTimeline />}>
        <div>Hello World</div>
      </Container>
    </div>
  ),
};
