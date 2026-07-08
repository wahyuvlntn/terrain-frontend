import { FolderOpenFill2 } from '@digital-twin/icons';
import { UploadIcon } from '@digital-twin/reusables';
import { clsx } from 'clsx';
import { ChangeEventHandler, ReactNode } from 'react';

import { Popup } from '../navigation';
import { Button } from './button';
import styles from './file-input-popup.module.scss';

type FileInputPopupProps = {
  title: string;
  supportedFileTypes: string[];
  acceptMimeTypes: string[];
  uploadButtonLabel: string;
  onClose: () => void;
  onDownloadTemplate?: () => void;
  onSubmit: () => void;
  icon: ReactNode;
  isPending: boolean;
  open: boolean;
  onChange: (file: File) => void;
  value: File | undefined;
  wrapperClassName?: string;
};

export const FileInputPopup = ({
  uploadButtonLabel,
  supportedFileTypes,
  title,
  onSubmit,
  onClose,
  icon,
  isPending,
  open,
  acceptMimeTypes,
  value,
  onChange,
  onDownloadTemplate,
  wrapperClassName
}: FileInputPopupProps) => {
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files;
    if (files) {
      onChange(files[0]);
    }
  };

  return (
    <Popup
      title={title}
      open={open}
      onClose={onClose}
      icon={icon}
      variant={'custom'}
      submitButtonIcon={icon}
      submitButtonLabel={uploadButtonLabel}
      onSubmit={onSubmit}
      submitting={isPending}
      customButton={
        onDownloadTemplate ? (
          <Button onClick={onDownloadTemplate}>Download Template</Button>
        ) : null
      }
      wrapperClassName={wrapperClassName}
    >
      <div className={styles.FileInputPopup}>
        <UploadIcon className={styles.FileInputPopup__UploadIcon} />
        <span className={styles.FileInputPopup__GenericDesc}>
          Browse to upload file from your computer
        </span>
        <span className={styles.FileInputPopup__FileSupportDesc}>
          {'Supported File type: '}
          <b>{`(${supportedFileTypes.join(',')})`}</b>
        </span>
        <Button
          color={'default-secondary'}
          className={styles.FileInputPopup__BrowseBtn}
        >
          <FolderOpenFill2 />
          <span>Browse</span>
          <input
            type="file"
            id={'file-upload'}
            accept={acceptMimeTypes.join(', ')}
            className={styles.FileInputPopup__BrowseBtnInput}
            value={''}
            onChange={handleOnChange}
          />
        </Button>
        <span
          className={clsx(
            styles.FileInputPopup__SelectedFile,
            value && styles.visible
          )}
        >
          Selected: <b>{value?.name}</b>
        </span>
      </div>
    </Popup>
  );
};
