import { ImagePlaceholder } from '@digital-twin/icons';
import appIcon from '@digital-twin/images/app-icon.svg';
import { Login as LoginReusable } from '@digital-twin/reusables';
import { APP_NAME, getPostSigninPath, getURL, SESSION_ID_HEADER, t } from '@digital-twin/utils';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingCircle } from '../../others';
import { ThemeContext } from '../admin';
import { getDemoSession } from './auth.api';
import { AuthCtx } from './auth.context';
import styles from './login.module.scss';

type LoginProps = {
  title: string;
  productLogo: ReactNode;
  bgImageUrl: string;
};

/**
 * Demo mode: the backend signs every visitor in as its DEMO_USER, so the sign-in route only
 * shows a splash and continues to the requested page. The form appears when demo mode is off.
 */
export const Login = (props: LoginProps) => {
  const [demoOff, setDemoOff] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect-url');

  useEffect(() => {
    let live = true;
    getDemoSession()
      .then((token) => {
        if (!live) return;
        if (!token) return setDemoOff(true);
        window.localStorage.setItem(SESSION_ID_HEADER, token);
        navigate(getPostSigninPath(redirect), { replace: true });
      })
      .catch(() => live && setDemoOff(true));
    return () => {
      live = false;
    };
  }, [navigate, redirect]);

  if (demoOff) return <SigninForm {...props} />;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-(--afdd-background-lowest) text-(--afdd-neutral-text-caption)">
      {props.productLogo}
      <div className="relative h-12 w-12">
        <LoadingCircle isLoading={true} scale={0.5} />
      </div>
      <span>Starting demo session…</span>
    </div>
  );
};

const SigninForm = ({ bgImageUrl, productLogo, title }: LoginProps) => {
  const { signin, initialPassword, initialIsRemember, initialUsername } = useContext(AuthCtx);
  const {
    logo,
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  return (
    <LoginReusable
      titleClassName={styles.Login__title}
      showFooter={true}
      logo={productLogo}
      title={title}
      onLogin={signin}
      formLogo={
        <img
          src={logo ? `${getURL()}${logo}` : appIcon}
          alt={logo ? 'Organization logo' : APP_NAME}
          width={80}
          height={80}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = ImagePlaceholder(backgroundLowest);
          }}
        />
      }
      background={
        <img
          src={bgImageUrl}
          alt={'factory'}
          style={{
            width: 1033,
            position: 'absolute',
            bottom: 30,
            right: 480,
          }}
        />
      }
      initialUsername={initialUsername}
      initialPassword={initialPassword}
      initialIsRemember={initialIsRemember}
      internationalization={{
        welcome: t('common.welcome'),
        accountSignIn: t('common.sign_in_to_your_account'),
        usernameLabel: t('common.username'),
        passwordLabel: t('common.password'),
        rememberMeLabel: t('common.remember_me'),
        signIn: t('common.sign_in'),
        usernamePlaceholder: t('common.login_placeholder_username'),
        //TODO: missing translation
        passwordPlaceholder: t('common.login_placeholder_password'),
        footerText: `${title} · ${t('common.application_footer')}`,
      }}
    />
  );
};
