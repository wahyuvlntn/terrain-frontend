import { ImagePlaceholder } from '@digital-twin/icons';
import appIcon from '@digital-twin/images/app-icon.svg';
import { APP_NAME, getURL, t } from '@digital-twin/utils';
import { Login as LoginReusable } from '@digital-twin/reusables';
import { ReactNode, useContext } from 'react';

import { ThemeContext } from '../admin';
import { AuthCtx } from './auth.context';
import styles from './login.module.scss';

type LoginProps = {
  title: string;
  productLogo: ReactNode;
  bgImageUrl: string;
};

export const Login = ({ bgImageUrl, productLogo, title }: LoginProps) => {
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
