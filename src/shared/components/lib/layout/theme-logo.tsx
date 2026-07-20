import { ImagePlaceholder } from '@digital-twin/icons';
import { getURL } from '@digital-twin/utils';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { useContext, useEffect } from 'react';
import { ThemeContext } from '../feat';
import styles from './theme-logo.module.scss';

interface ThemeLogoProps {
  isExpanded: boolean;
  minWidth: number;
  maxWidth: number;
}

export const ThemeLogo = ({ isExpanded, minWidth, maxWidth }: ThemeLogoProps) => {
  const width = useMotionValue(isExpanded ? maxWidth : minWidth);
  const widthTween = useSpring(width, {
    bounce: 0,
    velocity: 0,
    duration: 400,
  });
  const widthTranformed = useMotionTemplate`${widthTween}px`;

  const height = useMotionValue(isExpanded ? 170 : 85);
  const heightTween = useSpring(height, {
    bounce: 0,
    velocity: 0,
    duration: 400,
  });
  const heightTranformed = useMotionTemplate`${heightTween}px`;

  const logoWidth = useMotionValue(isExpanded ? 100 : 50);
  const logoWidthTween = useSpring(logoWidth, {
    bounce: 0,
    velocity: 0,
    duration: 400,
  });
  const logoWidthTranformed = useMotionTemplate`${logoWidthTween}px`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: minWidth & maxWidth are assumed to be stable
  useEffect(() => {
    width.set(isExpanded ? maxWidth : minWidth);
    height.set(isExpanded ? 170 : 85);
    logoWidth.set(isExpanded ? 100 : 50);
  }, [isExpanded, width]);

  const {
    logo,
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  if (!logo) {
    return null;
  }

  return (
    <motion.div
      layout={true}
      className={styles['theme-logo-container']}
      style={{
        width: widthTranformed,
        minWidth: widthTranformed,
        height: heightTranformed,
        minHeight: heightTranformed,
      }}
    >
      <motion.img
        src={`${getURL()}${logo}`}
        alt="Organization logo"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = ImagePlaceholder(backgroundLowest);
        }}
        className={styles['theme-logo']}
        style={{ width: logoWidthTranformed, minWidth: logoWidthTranformed }}
      />
    </motion.div>
  );
};
