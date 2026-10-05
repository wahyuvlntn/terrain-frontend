import { AuthCtx } from '@digital-twin/components';
import {
  AlertAlarm,
  AssetV3,
  Bulb,
  ChartAlert,
  Cube,
  DatasetGrid,
  HardwareChip,
  Instruction,
  LockClosed,
  MOrder,
  MPerform,
  Personnel,
  SettingAlert,
  Timer,
} from '@digital-twin/icons';
import { ComponentType, memo, SVGProps, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import styles from '../ai-assistant.module.scss';
import { assistantStore } from '../ai-assistant.store';
import { NavigationTarget } from '../api/ai-assistant.api';
import {
  canOpenTarget,
  NavPage,
  navigationDetail,
  navigationLink,
  navigationState,
  PAGE_TITLE,
} from '../navigation';

/** the sidebar icon of each page (app.tsx) */
const PAGE_ICON: Record<NavPage, ComponentType<SVGProps<SVGSVGElement>>> = {
  'digital-twin': Cube,
  'ai-insights': Bulb,
  simulation: Timer,
  production: HardwareChip,
  'asset-overview': AssetV3,
  'alarm-report': AlertAlarm,
  'maintenance-order': MOrder,
  'maintenance-performance': MPerform,
  'maintenance-instruction': Instruction,
  'location-overview': DatasetGrid,
  'early-warning-and-diagnostics': SettingAlert,
  'early-warning-dashboard': ChartAlert,
  'personnel-management': Personnel,
  'plant-overview': DatasetGrid,
};

type NavigationCardProps = { target: NavigationTarget };

/**
 * A place in the app the agent opened: label, page and what it shows, and Open to go there
 * again (the panel steps aside so the place is not hidden behind it). Users without Read on the
 * page get a disabled "No access" instead (the agent does not know the user's page permissions).
 */
export const NavigationCard = memo(({ target }: NavigationCardProps) => {
  const { hasPermission } = useContext(AuthCtx);
  const navigate = useNavigate();
  const location = useLocation();
  const allowed = canOpenTarget(target, hasPermission);
  const Icon = PAGE_ICON[target.page];
  const page = PAGE_TITLE[target.page];
  const detail = navigationDetail(target);
  // the same URL the answer opened: a twin replay on show stays on
  const link = navigationLink(target, location);

  return (
    <div className={styles.nav} role="group" aria-label={`Opened in the app: ${target.label}`}>
      <span className={styles.nav__icon} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.nav__text}>
        <strong title={target.label}>{target.label}</strong>
        <span title={detail ? `${page} · ${detail}` : page}>
          {detail ? `${page} · ${detail}` : page}
        </span>
      </span>
      {allowed ? (
        <button
          type="button"
          className={styles.btn}
          title={`Open ${link}`}
          aria-label={`Open ${target.label}`}
          onClick={() => {
            navigate(link, { state: navigationState(target, location) });
            assistantStore.setOpen(false);
          }}
        >
          Open
        </button>
      ) : (
        <button
          type="button"
          className={styles.nav__denied}
          disabled
          title={`You have no access to ${page}`}
        >
          <LockClosed aria-hidden="true" />
          No access
        </button>
      )}
    </div>
  );
});
NavigationCard.displayName = 'NavigationCard';
