import { ChangeEventHandler, ReactNode, useEffect, useState } from 'react';
import { default as LockFillIcon } from '../../icons/LockFillIcon';
import { default as UserFillIcon } from '../../icons/UserFillIcon';
import { ButtonProduct as Button } from '../../input/Button/Button.product';
import { Checkbox } from '../../input/Checkbox/Checkbox';
import { Input } from '../../input/Input/Input';
import { InputPassword } from '../../input/InputPassword/InputPassword';
import { cn } from '../../utils';

const RectTopStart = () => {
  return (
    <svg
      width="911"
      height="421"
      viewBox="0 0 911 421"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute top-0 left-0 text-(--afdd-background-default)"
    >
      <g filter="url(#filter0_d_47_87569)">
        <rect
          width="756.658"
          height="813.102"
          rx="80"
          transform="matrix(0.866025 0.5 -0.866025 0.5 247.166 -394)"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_47_87569"
          x="-465.416"
          y="-415.568"
          width="1376.28"
          height="836.017"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="24.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_87569" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_47_87569"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

const RectTopEnd = () => {
  return (
    <svg
      width="806"
      height="586"
      viewBox="0 0 806 586"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute top-0 right-0 text-(--afdd-background-default)"
    >
      <g filter="url(#filter0_d_47_87570)">
        <rect
          width="856.77"
          height="529.335"
          rx="80"
          transform="matrix(0.866025 0.5 -0.866025 0.5 467.418 -137)"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_47_87570"
          x="0.584961"
          y="-158.568"
          width="1217.23"
          height="744.189"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="24.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_87570" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_47_87570"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

const RectBottomEnd = () => {
  return (
    <svg
      width="1504"
      height="707"
      viewBox="0 0 1504 707"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 right-52.5 text-(--afdd-background-default)"
    >
      <g filter="url(#filter0_d_47_87571)">
        <rect
          width="925.869"
          height="794.04"
          rx="83"
          transform="matrix(0.866025 0.5 -0.866025 0.5 694.658 21)"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_47_87571"
          x="0.105469"
          y="0.310547"
          width="1503.27"
          height="909.334"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="24.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_47_87571" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_47_87571"
            result="shape"
          />
        </filter>
        <linearGradient
          id="paint0_linear_47_87571"
          x1="18.3604"
          y1="668.64"
          x2="340.279"
          y2="-41.3309"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0B66AC" />
          <stop offset="1" stopColor="#0C5E9D" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const RectBottomLeft = () => {
  return (
    <svg
      className="absolute bottom-0 left-0 text-(--afdd-background-default)"
      width="212"
      height="493"
      viewBox="0 0 212 493"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_d_9485_265876)">
        <rect
          width="856.77"
          height="529.335"
          rx="80"
          transform="matrix(0.866025 0.5 -0.866025 0.5 -538.582 21.5684)"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_9485_265876"
          x="-1005.42"
          y="0"
          width="1217.23"
          height="744.189"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="24.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_9485_265876" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_9485_265876"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

interface LoginProps {
  logo: ReactNode;
  title: string;
  onLogin: (username: string, password: string, isRemember: boolean) => Promise<void>;
  formLogo: ReactNode;
  background: ReactNode;
  initialUsername: string;
  initialPassword: string;
  initialIsRemember: boolean;
  internationalization?: {
    welcome?: string;
    accountSignIn?: string;
    usernameLabel?: string;
    passwordLabel?: string;
    rememberMeLabel?: string;
    signIn?: string;
    footerText?: string;
    usernamePlaceholder?: string;
    passwordPlaceholder?: string;
  };
  showFooter?: boolean;
  titleClassName?: string;
  usernameInputClassName?: string;
  passwordInputClassName?: string;
  loginButtonClassName?: string;
  footerClassName?: string;
}

export const Login = ({
  onLogin,
  formLogo,
  logo,
  title,
  background,
  initialIsRemember,
  initialPassword,
  initialUsername,
  internationalization,
  showFooter = true,
  titleClassName,
  usernameInputClassName,
  passwordInputClassName,
  loginButtonClassName,
  footerClassName,
}: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRememberMeChecked, setIsRememberMeChecked] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    setPassword(initialPassword);
  }, [initialPassword]);

  useEffect(() => {
    setIsRememberMeChecked(initialIsRemember);
  }, [initialIsRemember]);

  const handleUsernameChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setUsername(e.target.value);
  };
  const handlePasswordChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setPassword(e.target.value);
  };
  const handleRememberMeChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setIsRememberMeChecked(e.target.checked);
  };

  return (
    <div className="flex h-full bg-(--afdd-background-low) text-(--afdd-neutral-text-title-heading)">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="overflow-hidden h-full">
          <RectTopStart />
          <RectTopEnd />
          <RectBottomEnd />
          <RectBottomLeft />
          {background}
          <div className="relative flex flex-row items-center gap-4 w-full mt-25 px-10 lg:px-16">
            {logo}
            <div className={cn('flex flex-col text-[60px] font-semibold', titleClassName)}>
              <span>{title}</span>
            </div>
          </div>
        </div>
        {showFooter && (
          <footer
            className={cn(
              "relative flex flex-row items-center justify-between w-full px-10 py-2 box-border [&::before]:content-[''] [&::before]:absolute [&::before]:inset-0 [&::before]:bg-(--afdd-background-high) [&::before]:opacity-40 [&::before]:backdrop-blur-[6px]",
              footerClassName
            )}
          >
            <div className="flex flex-col items-center isolate text-(--afdd-neutral-text-title-heading)">
              <span>
                {internationalization?.footerText ?? title}
              </span>
            </div>
            <div />
          </footer>
        )}
      </div>
      <div className="w-150 min-w-150 flex flex-col items-center gap-20 justify-center bg-(--afdd-background-lowest) px-23.25 box-border relative">
        <form
          className="flex flex-col items-center gap-10 items-start w-full"
          onSubmit={(e) => {
            e.preventDefault();
            setIsPending(true);
            void onLogin(username, password, isRememberMeChecked).finally(() => {
              setIsPending(false);
            });
          }}
        >
          <div className="flex flex-col items-center gap-2 items-start [&_h1]:font-semibold [&_h3]:text-(--afdd-neutral-text-body-neutral)">
            <h1>{internationalization?.welcome ?? `Welcome`}</h1>
            <h3>{internationalization?.accountSignIn ?? `Sign in to your account`}</h3>
          </div>
          <div className="flex flex-col items-center gap-2.5 w-full">
            <Input
              type={'text'}
              value={username}
              onChange={handleUsernameChange}
              placeholder={internationalization?.usernamePlaceholder ?? 'Enter your username'}
              wrapperClassName={cn(
                'w-full [&_svg]:text-[var(--afdd-neutral-text-title-heading)]'
              )}
              fieldClassName={usernameInputClassName}
              inputPrefix={<UserFillIcon />}
              label={internationalization?.usernameLabel ?? 'Username'}
            />
            <InputPassword
              value={password}
              onChange={handlePasswordChange}
              placeholder={internationalization?.passwordPlaceholder ?? 'Enter your password'}
              wrapperClassName={cn(
                'w-full [&_svg]:text-[var(--afdd-neutral-text-title-heading)]'
              )}
              fieldClassName={passwordInputClassName}
              label={internationalization?.passwordLabel ?? 'Password'}
              inputPrefix={<LockFillIcon />}
            />
          </div>
          <div className="flex flex-col items-center gap-3.75 items-start w-full [&_button]:w-full [&_button]:justify-center [&_button]:rounded">
            <div>
              <Checkbox
                checked={isRememberMeChecked}
                onChange={handleRememberMeChange}
                label={internationalization?.rememberMeLabel ?? 'Remember Me'}
              />
            </div>
            <Button type={'submit'} disabled={isPending} className={loginButtonClassName}>
              {internationalization?.signIn ?? 'Sign In'}
            </Button>
          </div>
        </form>
        <div>{formLogo}</div>
      </div>
    </div>
  );
};
