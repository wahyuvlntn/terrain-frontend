import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { CSSProperties, ForwardedRef, forwardRef, Ref } from 'react';
import { cn } from '../../utils';
import { DropdownItem, DropdownItemProps } from './DropdownItem';

export type AdditionalKeys = Record<string, unknown>;

export type DropdownItemWithAdditionalKeys<T extends AdditionalKeys> = DropdownItemProps & T;

export type SubItemType<T extends AdditionalKeys> = DropdownItemProps & T;

export type OptionItem<
  T extends AdditionalKeys,
  K extends AdditionalKeys,
> = DropdownItemWithAdditionalKeys<T> & {
  subItems: SubItemType<K>[];
};

export interface UserOptionsProps<T extends AdditionalKeys, K extends AdditionalKeys> {
  /**
   * The full name of the user.
   */
  fullName: string;
  /**
   * The email address of the user.
   */
  email: string;
  dropdownItems: OptionItem<T, K>[];
  className?: string;
  style?: CSSProperties;
  onSelectItem?: (e: Event, item: OptionItem<T, K>) => void;
  onSelectSubItem?: (e: Event, item: OptionItem<T, K>, subItem: SubItemType<K>) => void;
}

const UserOptionComponent = <T extends AdditionalKeys, K extends AdditionalKeys>(
  {
    fullName,
    className,
    style,
    onSelectItem,
    onSelectSubItem,
    dropdownItems,
    email,
  }: UserOptionsProps<T, K>,
  ref: ForwardedRef<HTMLDivElement>
) => {
  const renderItem = (item: DropdownItemProps, index: string, onSelect: (e: Event) => void) => {
    return (
      <DropdownMenu.Item
        key={index}
        className={cn(
          "rounded outline-none data-[state='open']:bg-(--afdd-background-high) focus:bg-(--afdd-background-high)"
        )}
        onSelect={onSelect}
      >
        <DropdownItem
          id={item.id}
          prefixIcon={item.prefixIcon}
          text={item.text}
          suffixIcon={item.suffixIcon}
          active={item.active}
        />
      </DropdownMenu.Item>
    );
  };

  const renderItemHasSubItems = (item: OptionItem<T, K>, index: number) => {
    return (
      <DropdownMenu.Sub key={index}>
        <DropdownMenu.SubTrigger
          className={cn(
            "rounded outline-none data-[state='open']:bg-(--afdd-background-high) focus:bg-(--afdd-background-high)"
          )}
        >
          <DropdownItem
            id={item.id}
            prefixIcon={item.prefixIcon}
            text={item.text}
            suffixIcon={item.suffixIcon}
            active={item.active}
          />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          className={cn(
            'bg-(--afdd-background-default) rounded-lg border border-(--afdd-border-default) p-1 min-w-34.25 shadow-[0_4px_8px_0_rgba(0,0,0,0.06)]'
          )}
          sideOffset={10}
        >
          {item.subItems.map((subItem, idx) => {
            return renderItem(subItem, `${index}-${idx}`, (e) => {
              onSelectSubItem?.(e, item, subItem);
            });
          })}
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    );
  };
  return (
    <DropdownMenu.Content
      className={cn(
        'bg-(--afdd-background-default) shadow-[0_8px_16px_0_rgba(0,0,0,0.08)] rounded-lg py-4 px-2 text-(--afdd-neutral-text-title-heading) mr-3 min-w-60 [&_path]:fill-(--afdd-neutral-text-title-heading)',
        className
      )}
      style={style}
      sideOffset={19}
      ref={ref}
    >
      <div className="flex flex-col px-2 [&_span]:leading-[25.6px] [&_span:first-child]:font-semibold [&_span:last-child]:font-normal">
        <span>{fullName}</span>
        <span>{email}</span>
        <div className="mt-2 mb-0.5 h-0.5 w-full bg-(--afdd-border-separator-neutral)" />
      </div>
      {dropdownItems.map((item, index) => {
        return item.subItems.length > 0
          ? renderItemHasSubItems(item, index)
          : renderItem(item, `${index}`, (e) => {
              onSelectItem?.(e, item);
            });
      })}
    </DropdownMenu.Content>
  );
};

UserOptionComponent.displayName = 'UserOptions';

export const UserOptions = forwardRef(UserOptionComponent) as <
  T extends AdditionalKeys,
  K extends AdditionalKeys,
>(
  props: UserOptionsProps<T, K> & { ref?: Ref<HTMLElement> }
) => ReturnType<typeof UserOptionComponent>;
