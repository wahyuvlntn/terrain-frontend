import { default as BadgeIcon } from '../../../icons/BadgeIcon';
import { default as MailIcon } from '../../../icons/MailIcon';
import { default as UserIcon } from '../../../icons/UserIcon';
import { cn } from '../../../utils';

export const HeaderInfo = ({
  fullName,
  username,
  badge,
}: {
  fullName: string;
  username: string;
  badge: string;
}) => {
  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div
        className={cn(
          'flex items-center gap-2 [&_h5]:text-[16px] [&_h5]:font-medium [&_h5]:leading-5 [&_h5]:overflow-hidden [&_h5]:text-ellipsis [&_h5]:whitespace-nowrap [&_svg]:w-5 [&_svg]:h-5 [&_svg]:min-w-5 [&_svg]:min-h-5 [&_svg_path]:fill-current',
          'overflow-hidden text-ellipsis whitespace-nowrap'
        )}
      >
        <UserIcon />
        <h5>{fullName}</h5>
      </div>
      <div
        className={cn(
          'flex items-center gap-2 [&_h5]:text-[16px] [&_h5]:font-medium [&_h5]:leading-5 [&_h5]:overflow-hidden [&_h5]:text-ellipsis [&_h5]:whitespace-nowrap [&_svg]:w-5 [&_svg]:h-5 [&_svg]:min-w-5 [&_svg]:min-h-5 [&_svg_path]:fill-current',
          'overflow-hidden text-ellipsis whitespace-nowrap'
        )}
      >
        <MailIcon />
        <h5>{username}</h5>
      </div>
      <div
        className={cn(
          'flex items-center gap-2 [&_h5]:text-[16px] [&_h5]:font-medium [&_h5]:leading-5 [&_h5]:overflow-hidden [&_h5]:text-ellipsis [&_h5]:whitespace-nowrap [&_svg]:w-5 [&_svg]:h-5 [&_svg]:min-w-5 [&_svg]:min-h-5 [&_svg_path]:fill-current',
          'overflow-hidden text-ellipsis whitespace-nowrap'
        )}
      >
        <BadgeIcon />
        <h5>{badge}</h5>
      </div>
    </div>
  );
};
