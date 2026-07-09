import {
  Check,
  CloudUploadFill,
  Plus,
  Reload,
  SaveFill,
  Sync,
  TrashDeleteFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { Popup as PopupReusable } from '@digital-twin/reusables';
import clsx from 'clsx';
import { ReactNode, useRef } from 'react';

import { Button, Color as ButtonColor } from '../input';
import { ClosedBy } from './closed-by';
import styles from './popup.module.scss';

interface PopupProps {
  children?: ReactNode;
  title: string;
  icon?: ReactNode;
  informationIcon?: ReactNode;
  open: boolean;
  onClose: () => void;
  afterClose?: (closedBy: ClosedBy) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  variant?:
    | 'none'
    | 'reset'
    | 'delete'
    | 'upload'
    | 'apply'
    | 'save'
    | 'add'
    | 'enable'
    | 'sync'
    | 'custom';
  background?: 'dark' | 'none' | 'none-without-padding';
  width?: number | string;
  disableSubmit?: boolean;
  swapButtonPosition?: boolean;
  submitButtonIcon?: ReactNode;
  submitButtonLabel?: string;
  submitButtonColor?: ButtonColor;
  rightTopComponent?: ReactNode;
  customButton?: ReactNode;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export const Popup = ({
  children,
  icon,
  informationIcon,
  open,
  title,
  onClose,
  afterClose,
  onSubmit,
  submitting,
  variant = 'none',
  background = 'dark',
  width,
  disableSubmit,
  swapButtonPosition,
  submitButtonLabel,
  submitButtonIcon,
  submitButtonColor = 'default-primary',
  rightTopComponent,
  customButton,
  wrapperClassName,
  wrapperStyle
}: PopupProps) => {
  const closedBy = useRef<ClosedBy | undefined>(ClosedBy.EXTERNAL);

  const closeByBlur = () => {
    closedBy.current = undefined;
    onClose();
  };

  const closeByCancel = () => {
    closedBy.current = ClosedBy.CANCEL;
    onClose();
  };

  const handleAfterClose = () => {
    if (closedBy.current != null && typeof afterClose === 'function') {
      afterClose(closedBy.current);
    }

    closedBy.current = ClosedBy.EXTERNAL;
  };

  const handleClose = (closedBy: 'blur' | 'close-icon') => {
    if (closedBy === 'blur') closeByBlur();
    else closeByCancel();
  };

  const renderButton = () => {
    const disabled = submitting || disableSubmit;
    const buttonProps = {
      type: 'submit' as const,
      disabled,
    };
    if (variant === 'custom') {
      return (
        <>
          {customButton}
          <Button
            icon={submitButtonIcon}
            color={submitButtonColor}
            {...buttonProps}
          >
            {submitButtonLabel}
          </Button>
        </>
      );
    } else if (variant === 'upload') {
      return (
        <Button
          icon={<CloudUploadFill />}
          color={'default-primary'}
          {...buttonProps}
        >
          {t('common.upload')}
        </Button>
      );
    } else if (variant === 'reset') {
      return (
        <Button icon={<Reload />} color={'error'} {...buttonProps}>
          {t('common.reset')}
        </Button>
      );
    } else if (variant === 'apply') {
      return (
        <Button icon={<Check />} color={'default-primary'} {...buttonProps}>
          {t('common.apply')}
        </Button>
      );
    } else if (variant === 'save') {
      return (
        <Button icon={<SaveFill />} color={'default-primary'} {...buttonProps}>
          {t('common.save')}
        </Button>
      );
    } else if (variant === 'add') {
      return (
        <Button icon={<Plus />} color={'default-primary'} {...buttonProps}>
          {t('common.add')}
        </Button>
      );
    } else if (variant === 'enable') {
      return (
        <Button icon={<Reload />} color={'default-primary'} {...buttonProps}>
          {t('common.enable')}
        </Button>
      );
    } else if (variant === 'sync') {
      return (
        <Button icon={<Sync />} color={'default-primary'} {...buttonProps}>
          {t('common.sync')}
        </Button>
      );
    } else {
      return (
        <Button icon={<TrashDeleteFill />} color={'error'} {...buttonProps}>
          {t('common.delete')}
        </Button>
      );
    }
  };

  return (
    <PopupReusable
      open={open}
      onClose={handleClose}
      afterClose={handleAfterClose}
      title={title}
      titlePrefix={icon}
      titleSuffix={informationIcon}
      rightTopComponent={rightTopComponent}
      wrapperClassName={wrapperClassName}
      wrapperStyle={wrapperStyle}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof onSubmit === 'function') {
            onSubmit();
          }
        }}
        style={{
          width,
          maxWidth: width,
        }}
      >
        <div
          className={clsx(
            styles.body,
            background === 'dark' && styles['body--dark'],
            background === 'none' && styles['body--none']
          )}
        >
          {children}
        </div>
        {variant === 'none' ? null : (
          <div className={styles.footer}>
            {swapButtonPosition ? null : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  closeByCancel();
                }}
                disabled={submitting}
                color={'default-secondary'}
                type="button"
              >
                {t('common.cancel')}
              </Button>
            )}

            {renderButton()}

            {swapButtonPosition ? (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  closeByCancel();
                }}
                disabled={submitting}
                color={'default-secondary'}
                type="button"
              >
                {t('common.cancel')}
              </Button>
            ) : null}
          </div>
        )}
      </form>
    </PopupReusable>
  );
};
