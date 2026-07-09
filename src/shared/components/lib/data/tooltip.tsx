import { InformationCircle } from '@digital-twin/icons';
import clsx from 'clsx';
import { CSSProperties, ReactNode, useId, useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverContext,
} from '../others';
import styles from './tooltip.module.scss';

type TooltipProps = {
  width?: string | number;
  height?: string | number;
  position?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end'
    | string;
  title?: string;
  content?: ReactNode;
  size?: 'small' | 'large';
  top?: string | number;
  left?: string | number;
  bottom?: string | number;
  right?: string | number;
  contentStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
};

export const TooltipContent = ({
  height,
  width,
  position = 'top-start',
  title,
  content,
  size = 'small',
  top,
  left,
  right,
  bottom,
  contentStyle,
  className,
  style,
}: TooltipProps) => {
  return (
    <div
      className={clsx(
        styles['tooltip-content'],
        styles[position],
        size === 'large' && styles.large,
        className
      )}
      style={{
        width: size === 'large' ? undefined : width,
        maxWidth: size === 'large' ? undefined : width,
        height: size === 'large' ? undefined : height,
        top,
        left,
        bottom,
        right,
        zIndex: 10,
        position: size === 'large' ? 'absolute' : undefined,
        ...style,
      }}
    >
      {title && size === 'small' ? (
        <span className={styles.title}>{title}</span>
      ) : null}
      {
        <div className={styles.content} style={contentStyle}>
          {content}
        </div>
      }
    </div>
  );
};

const TooltipContentPopover = ({ ...props }: TooltipProps) => {
  const { placement } = usePopoverContext();
  const placementSplit = placement.split('-');
  const prefix = placementSplit[0];
  const suffix = placementSplit[1];

  let newPlacement: string;
  if (prefix === 'top') newPlacement = 'bottom';
  else if (prefix === 'bottom') newPlacement = 'top';
  else if (prefix === 'left') newPlacement = 'right';
  else newPlacement = 'left';

  newPlacement = `${newPlacement}${suffix ? '-' + suffix : ''}`;

  return (
    <PopoverContent
      className={clsx(styles.wrapper, styles[newPlacement])}
      style={{ padding: 0 }}
    >
      <TooltipContent {...props} position={newPlacement} />
    </PopoverContent>
  );
};

type InfoTooltipProps = Omit<TooltipProps, 'position'>;

export const InfoTooltip = ({ ...props }: InfoTooltipProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const id = useId();

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement={'bottom-start'}
      // offset={0}
    >
      <PopoverTrigger
        onClick={() => setPopoverOpen((prev) => !prev)}
        className={styles.trigger}
        style={{
          height: 24,
        }}
      >
        <InformationCircle className={styles.icon} id={id} />
      </PopoverTrigger>
      <TooltipContentPopover {...props} />
    </Popover>
  );
};
