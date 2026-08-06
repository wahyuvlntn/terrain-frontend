import { useEffect } from 'react';

import { ReactComponent as Content } from '../../assets/Maintenance Performance.svg';
import styles from './preview-web.module.scss';

type PreviewWeb = {
  onLoad: () => void;
};
const PreviewWeb = ({ onLoad }: PreviewWeb) => {
  useEffect(() => {
    onLoad();
  }, []);

  return <Content className={styles['preview-content']} />;
};

export default PreviewWeb;
