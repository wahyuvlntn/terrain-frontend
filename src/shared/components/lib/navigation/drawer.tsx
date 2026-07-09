import { COLOR } from '@digital-twin/components';
import { Check, CloudUploadFill, PlayFill, Plus, SaveFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import {
  CloseIcon,
  Drawer as DrawerReusable,
  SaveFillIcon,
} from '@digital-twin/reusables';
import clsx from 'clsx';
import { FormEventHandler, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '../input';
import { ClosedBy } from './closed-by';
import styles from './drawer.module.scss';

interface DrawerProps {
  children?: ReactNode;
  title: string;
  icon: ReactNode;
  open: boolean;
  onClose: () => void;
  afterClose?: (closedBy: ClosedBy) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  submitting?: boolean;
  disableSubmit?: boolean;
  variant?: 'save' | 'add' | 'execute' | 'apply' | 'print' | 'upload';
  informationIcon?: ReactNode;
  background?: 'dark' | 'none';
  drawerTopRightComponent?: ReactNode;
  customFooterComponent?: ReactNode;
}

export const Drawer = ({
  variant = 'save',
  background = 'dark',
  children,
  onClose,
  drawerTopRightComponent,
  customFooterComponent,
  ...props
}: DrawerProps) => {
  const renderSubmitButton = () => {
    switch (variant) {
      case 'add':
        return (
          <Button icon={<Plus />} color={'default-primary'} type={'submit'}>
            {t('common.add')}
          </Button>
        );
      case 'execute':
        return (
          <Button icon={<PlayFill />} color={'default-primary'} type={'submit'}>
            {t('common.execute')}
          </Button>
        );
      case 'apply':
        return (
          <Button icon={<Check />} color={'default-primary'} type={'submit'}>
            {t('common.apply')}
          </Button>
        );
      case 'print':
        return (
          <Button color={'default-primary'} type={'submit'} icon={<SaveFillIcon/>}>
            {t('common.save')}
          </Button>
        );
      case 'upload':
        return (
          <Button
            icon={<CloudUploadFill />}
            color={'default-primary'}
            type={'submit'}
          >
            {t('common.upload')}
          </Button>
        );
      default:
        return (
          <Button icon={<SaveFill />} color={'default-primary'} type={'submit'}>
            {t('common.save')}
          </Button>
        );
    }
  };

  return (
    <DrawerReusable
      {...props}
      bodyClassName='drawer-test-classname'
      cancelButton={
        <Button color={'default-secondary'} type="button">
          {t('common.cancel')}
        </Button>
      }
      submitButton={renderSubmitButton()}
      onClose={onClose}
      contentClassName={clsx(
        'drawer-reusable',
        background === 'dark' && styles['drawer-reusable-dark']
      )}
    >
      <div
        className={clsx(
          styles.drawer,
          background === 'dark' && styles['drawer--dark']
        )}
      >
        {children}
      </div>
      <DrawerTopRightComponent
        onClose={onClose}
        drawerTopRightComponent={drawerTopRightComponent}
      />
      {customFooterComponent && (
        <CustomFooterComponent
          customFooterComponent={customFooterComponent}
          background={background}
        />
      )}
    </DrawerReusable>
  );
};

interface DrawerTopRightComponentProps {
  onClose: () => void;
  drawerTopRightComponent?: ReactNode;
}

const DrawerTopRightComponent = ({
  onClose,
  drawerTopRightComponent,
}: DrawerTopRightComponentProps) => {
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  useEffect(() => {
    setPortalContainer(document.querySelector('.drawer-reusable > div'));
  }, []);

  return (
    portalContainer &&
    createPortal(
      <div className={styles['right-top-component']}>
        {drawerTopRightComponent}
        <CloseIcon
          width={24}
          height={24}
          onClick={onClose}
          style={{ cursor: 'pointer' }}
        />
      </div>,
      portalContainer
    )
  );
};

interface CustomFooterComponentProps {
  customFooterComponent?: ReactNode;
  background: 'dark' | 'none';
}

const CustomFooterComponent = ({
  customFooterComponent,
  background,
}: CustomFooterComponentProps) => {
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  useEffect(() => {
    setPortalContainer(document.querySelector('.drawer-reusable > form'));
  }, []);

  return (
    portalContainer &&
    createPortal(
      <div
        className={styles['custom-footer-container']}
        style={{
          background:
            background === 'dark'
              ? COLOR.backgroundLowest
              : COLOR.backgroundLow,
          bottom: background === 'dark' ? 28 : 16,
        }}
      >
        {customFooterComponent}
      </div>,
      portalContainer
    )
  );
};
