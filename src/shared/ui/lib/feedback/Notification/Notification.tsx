import 'react-toastify/dist/ReactToastify.css';

import { toast as notif, ToastContainer, ToastContainerProps, ToastOptions } from 'react-toastify';
import { default as CheckCircleFillIcon } from '../../icons/CheckCircleFillIcon';
import { default as ErrorFillIcon } from '../../icons/ErrorFillIcon';
import { default as InfoFillIcon } from '../../icons/InfoFillIcon';
import { default as WarningFillIcon } from '../../icons/WarningFillIcon';

interface NotificationProps {
  /**
   * The position of the notification on the screen.
   * @type {"top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left"}
   */
  position?:
    | 'top-right'
    | 'top-center'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-center'
    | 'bottom-left';

  /**
   * The duration (in milliseconds) for which the notification is automatically closed.
   * @type {number}
   */
  autoClose?: number;

  /**
   * Additional props to be passed to the toast container.
   * @type {ToastContainerProps}
   */
  toastContainerProps?: ToastContainerProps;
}

export const Notification = ({ position, autoClose, toastContainerProps }: NotificationProps) => {
  return (
    <ToastContainer
      position={position ?? 'top-right'}
      autoClose={autoClose ?? 5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      icon={({ type }) => {
        if (type === 'success') return <CheckCircleFillIcon />;
        if (type === 'error') return <ErrorFillIcon />;
        if (type === 'warning') return <WarningFillIcon />;
        if (type === 'info') return <InfoFillIcon />;
      }}
      toastClassName="font-medium text-base text-[var(--afdd-neutral-text-body-light)]"
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
      {...toastContainerProps}
    />
  );
};

class Toast {
  info(message: React.ReactNode, options?: ToastOptions) {
    notif.info(message, {
      ...options,
    });
  }

  success(message: React.ReactNode, options?: ToastOptions) {
    notif.success(message, {
      ...options,
    });
  }

  warning(message: React.ReactNode, options?: ToastOptions) {
    notif.warning(message, {
      ...options,
    });
  }

  error(message: React.ReactNode, options?: ToastOptions) {
    notif.error(message, {
      ...options,
    });
  }
}

export const toast = new Toast();
