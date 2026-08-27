import { AppPagination, Popup } from '@digital-twin/components';
import { useState } from 'react';
import { TImage } from '../api/work-report';

type ImagePopupProps = {
  images: TImage[];
  open: boolean;
  onClose: () => void;
};

export const ImagePopup = ({ images, open, onClose }: ImagePopupProps) => {
  const [page, setPage] = useState(1);
  const title = images[page - 1]?.name ?? '';

  return (
    <Popup title={title} open={open} onClose={onClose}>
      <div>
        <AppPagination page={page} max={images.length} onChange={setPage} />
      </div>
    </Popup>
  );
};
