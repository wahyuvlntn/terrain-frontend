import {
  // Popover,
  // PopoverContent,
  // PopoverTrigger,
  InfoTooltip,
} from '@digital-twin/components';
import type { ReactNode } from 'react';
// import { InformationCircle } from '@digital-twin/icons';
// import type { Placement } from '@floating-ui/react';
import styles from './pm-info-tooltip.module.scss';

interface PMInfoTooltipProps {
  title: string;
  content: ReactNode;
}

export const PMInfoTooltip = ({ title, content }: PMInfoTooltipProps) => {
  return (
    <InfoTooltip
      title={title}
      content={content}
      className={styles['info']}
      contentStyle={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    />
    // <Popover offset={0} placement={placement ?? 'bottom-start'}>
    //   <PopoverTrigger className={styles['trigger']}>
    //     <InformationCircle width={iconSize} height={iconSize} />
    //   </PopoverTrigger>
    //   <PopoverContent className={styles['info']}>
    //     <span className={styles['title']}>{title}</span>
    //     <span className={styles['content']}>{content}</span>
    //   </PopoverContent>
    // </Popover>
  );
};
