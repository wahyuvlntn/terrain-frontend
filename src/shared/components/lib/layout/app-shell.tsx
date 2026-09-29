import { ChevronRight, LogOut, NotificationBell, Palette, Personnel } from '@digital-twin/icons';
import { Avatar, Dropdown, Label, Popover, Separator } from '@heroui/react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import styles from './app-shell.module.scss';

export type ShellCrumb = { text: string; to: { pathname?: string; search?: string } };

/* ------------------------------------------------------------------------------------------------
 * Header
 * ---------------------------------------------------------------------------------------------- */

type NotificationsProps = {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

const Notifications = ({ count, open, onOpenChange, children }: NotificationsProps) => (
  <Popover isOpen={open} onOpenChange={onOpenChange}>
    <Popover.Trigger className={styles['icon-button']} aria-label="Notifications">
      <NotificationBell />
      {count > 0 ? <span className={styles.count}>{count > 99 ? '99+' : count}</span> : null}
    </Popover.Trigger>
    <Popover.Content placement="bottom end" className={styles['notifications-popover']}>
      <Popover.Dialog aria-label="Notifications" className={styles['notifications-dialog']}>
        {children}
      </Popover.Dialog>
    </Popover.Content>
  </Popover>
);

export type UserMenuKey = 'my-profile' | 'theme-editor' | 'sign-out';

type UserMenuProps = {
  fullName: string;
  role?: string;
  photo?: string;
  onAction: (key: UserMenuKey) => void;
  labels: { myProfile: string; themeEditor: string; signOut: string };
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const UserAvatar = ({ fullName, photo, size }: { fullName: string; photo?: string; size: 'sm' | 'md' }) => (
  <Avatar size={size} className={styles.avatar}>
    {photo ? <Avatar.Image src={photo} alt={fullName} /> : null}
    <Avatar.Fallback>{initials(fullName)}</Avatar.Fallback>
  </Avatar>
);

const UserMenu = ({ fullName, role, photo, onAction, labels }: UserMenuProps) => (
  <Dropdown>
    <Dropdown.Trigger className={styles['user-trigger']} aria-label="Account menu">
      <UserAvatar fullName={fullName} photo={photo} size="sm" />
      <span className={styles['user-text']}>
        <span className={styles['user-name']}>{fullName}</span>
        {role ? <span className={styles['user-role']}>{role}</span> : null}
      </span>
    </Dropdown.Trigger>
    <Dropdown.Popover placement="bottom end" className={styles['user-popover']}>
      <div className={styles['user-card']}>
        <UserAvatar fullName={fullName} photo={photo} size="md" />
        <div>
          <div className={styles['user-name']}>{fullName}</div>
          {role ? <div className={styles['user-role']}>{role}</div> : null}
        </div>
      </div>
      <Separator />
      <Dropdown.Menu onAction={(key) => onAction(key as UserMenuKey)}>
        <Dropdown.Item id="my-profile" textValue={labels.myProfile}>
          <span className={styles['menu-icon']}>
            <Personnel />
          </span>
          <Label>{labels.myProfile}</Label>
        </Dropdown.Item>
        <Dropdown.Item id="theme-editor" textValue={labels.themeEditor}>
          <span className={styles['menu-icon']}>
            <Palette />
          </span>
          <Label>{labels.themeEditor}</Label>
        </Dropdown.Item>
        <Dropdown.Item id="sign-out" textValue={labels.signOut} variant="danger">
          <span className={styles['menu-icon']}>
            <LogOut />
          </span>
          <Label>{labels.signOut}</Label>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown.Popover>
  </Dropdown>
);

type HeaderProps = {
  icon?: ReactNode;
  crumbs: ShellCrumb[];
  notifications: NotificationsProps;
  user: UserMenuProps;
};

const ShellHeader = ({ icon, crumbs, notifications, user }: HeaderProps) => {
  const last = crumbs.length - 1;
  return (
    <header className={styles.header}>
      <div className={styles.crumbs}>
        {icon ? <span className={styles['crumb-icon']}>{icon}</span> : null}
        <ol className={styles['crumb-list']}>
          {crumbs.map((crumb, i) => (
            <li key={`${crumb.text}-${i}`} className={styles.crumb}>
              {i === last ? (
                <span className={styles['crumb-current']} aria-current="page">
                  {crumb.text}
                </span>
              ) : (
                <>
                  <Link to={crumb.to} className={styles['crumb-link']}>
                    {crumb.text}
                  </Link>
                  <ChevronRight className={styles['crumb-sep']} aria-hidden />
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.actions}>
        <Notifications {...notifications} />
        <span className={styles.divider} />
        <UserMenu {...user} />
      </div>
    </header>
  );
};

/* ------------------------------------------------------------------------------------------------
 * Frame
 * ---------------------------------------------------------------------------------------------- */

type AppShellProps = HeaderProps & { sidebar: ReactNode; children: ReactNode };

export const AppShell = ({ sidebar, children, ...header }: AppShellProps) => (
  <div className={styles.shell}>
    {sidebar}
    <div className={styles.main}>
      <ShellHeader {...header} />
      <main className={styles.content}>{children}</main>
    </div>
  </div>
);
