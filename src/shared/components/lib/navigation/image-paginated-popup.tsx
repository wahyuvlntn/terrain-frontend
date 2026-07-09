import { PhotoAlternative } from '@digital-twin/icons';
import { useEffect, useState } from 'react';

import { AppPagination } from './app-pagination';
import styles from './image-paginated-popup.module.scss';
import { Popup } from './popup';

type ImagePopupProps = {
  images: {
    src: string;
    name: string;
  }[];
  open: boolean;
  onClose: () => void;
  page?: number;
};

export const ImagePaginatedPopup = ({
  images,
  open,
  onClose,
  page = 1,
}: ImagePopupProps) => {
  const [currentPage, setCurrentPage] = useState(page);
  const image = images[currentPage - 1];

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  return (
    <Popup title={image?.name} open={open} onClose={onClose} background={'none'} wrapperStyle={{zIndex: 12}} icon={<PhotoAlternative />}>
      <div className={styles.ImagePaginatedPopup}>
        <img src={image?.src} />
        <AppPagination
          page={currentPage}
          max={images.length}
          onChange={setCurrentPage}
        />
      </div>
    </Popup>
  );
};
