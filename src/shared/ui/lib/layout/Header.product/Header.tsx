import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ReactNode, useState } from 'react';
import { default as NotificationFillIcon } from '../../icons/NotificationFill';
import { default as OptionIcon } from '../../icons/OptionIcon';
import { Popover, PopoverContent, PopoverTrigger } from '../../others/Popover/popover';
import { cn } from '../../utils';
import { UserAvatar, UserAvatarProps } from '../Header.platform/UserAvatar';
import { AdditionalKeys, UserOptions, UserOptionsProps } from '../UserOptions.platform/UserOptions';
import { Breadcrumbs, BreadcrumbsProps } from './Breadcrumbs';

interface NotificationProps {
  /**
   * The number of notifications.
   */
  count: number;
  /**
   * Children component that will be rendered when the open props is true.
   */
  children: ReactNode;
  /**
   * Callback function when the notification icon is clicked.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The open state of the notification.
   */
  open: boolean;

  icon?: ReactNode;
}

interface HeaderProductProps<T extends AdditionalKeys, K extends AdditionalKeys> {
  /**
   * Properties for configuring the breadcrumbs in the header.
   * This includes the icon, list of breadcrumb items, optional click handler, and a className for styling.
   */
  breadcrumbProps: BreadcrumbsProps;

  /**
   * Properties for configuring the user avatar in the header.
   */
  userAvatarProps: UserAvatarProps;

  /**
   * Properties for configuring the user options popover.
   */
  userOptionsProps: UserOptionsProps<T, K>;

  /**
   *
   */
  notificationProps: NotificationProps;

  /**
   * Additional class name for styling the container.
   */
  className?: string;

  /**
   * Additional styles for styling the container.
   */
  style?: React.CSSProperties;
}

export const Header = <T extends AdditionalKeys, K extends AdditionalKeys>({
  breadcrumbProps,
  userAvatarProps,
  className,
  style,
  notificationProps,
  userOptionsProps,
}: HeaderProductProps<T, K>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className={cn(
        'bg-(--afdd-background-low) overflow-auto flex h-13.75 gap-4 items-center w-full',
        className
      )}
      style={style}
    >
      <Breadcrumbs
        icon={breadcrumbProps.icon}
        items={breadcrumbProps.items}
        onClick={breadcrumbProps.onClick}
        className="flex w-full h-8 rounded pl-4"
      />
      <div className="flex flex-row items-center gap-4">
        <Popover
          open={notificationProps.open}
          onOpenChange={notificationProps.onOpenChange}
          placement={'bottom-end'}
        >
          <PopoverTrigger
            asChild
            onClick={() => {
              notificationProps.onOpenChange(true);
            }}
          >
            <div className="relative h-6 cursor-pointer text-(--afdd-neutral-text-title-heading) [&_svg]:w-6 [&_svg]:h-6">
              {notificationProps.icon ? (
                notificationProps.icon
              ) : (
                <>
                  <NotificationFillIcon />
                  {notificationProps.count > 0 && (
                    <div className="absolute -top-2.5 -right-2.5 bg-red-500 text-white rounded-lg px-1.25 py-0.5 text-xs leading-3">
                      {notificationProps.count > 99
                        ? '99+'
                        : notificationProps.count.toString().padStart(2, '0')}
                    </div>
                  )}
                </>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent>{notificationProps.children}</PopoverContent>
        </Popover>

        <div className="h-9 w-0.5 rounded bg-(--afdd-border-default)" />
        <div className="flex items-center gap-1.5 pr-2.5">
          <DropdownMenu.Root
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
            }}
          >
            <DropdownMenu.Trigger asChild>
              <UserAvatar
                fullName={userAvatarProps.fullName}
                imgSrc={userAvatarProps.imgSrc}
                onClick={userAvatarProps.onClick}
                wrapperClassname="w-8 h-8"
              />
            </DropdownMenu.Trigger>
            <DropdownMenu.Trigger asChild>
              <button className="bg-transparent border-0 p-0 appearance-none font-inherit rounded cursor-pointer h-6 text-(--afdd-neutral-text-title-heading) [&_svg]:w-6 [&_svg]:h-6">
                <OptionIcon onClick={userAvatarProps.onClick} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <UserOptions
                fullName={userOptionsProps.fullName}
                email={userOptionsProps.email}
                dropdownItems={userOptionsProps.dropdownItems}
                onSelectItem={userOptionsProps.onSelectItem}
                onSelectSubItem={userOptionsProps.onSelectSubItem}
              />
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </div>
  );
};
