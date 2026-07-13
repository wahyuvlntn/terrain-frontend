import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../../utils';

interface PrefixSuffixProps extends PropsWithChildren {
  prefix?: ReactNode;
  suffix?: ReactNode;
  large?: boolean;
}

const prefixSuffixClasses =
  'shrink-0 flex justify-center items-center font-[inherit] text-base font-medium text-current whitespace-nowrap min-w-[1.25em]';

export const PrefixSuffix = ({ children, prefix, suffix, large }: PrefixSuffixProps) => {
  return (
    <>
      {prefix ? (
        <div
          className={cn(prefixSuffixClasses, large && 'h-[2.625em]')}
          title={typeof prefix === 'string' ? prefix : undefined}
        >
          {prefix}
        </div>
      ) : null}

      {children}

      {suffix ? (
        <div
          className={cn(prefixSuffixClasses, large && 'h-[2.625em]')}
          title={typeof suffix === 'string' ? suffix : undefined}
        >
          {suffix}
        </div>
      ) : null}
    </>
  );
};
