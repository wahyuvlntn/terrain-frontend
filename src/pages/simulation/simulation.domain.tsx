import { HardwareChip, TempCold } from '@digital-twin/icons';
import { ReactNode } from 'react';

import { SimJobKind } from './api/simulation.api';
import styles from './simulation.module.scss';

/**
 * The two simulation workspaces: what-if scenarios on the CUB chiller plant model and production
 * plans on the FAB1 production model. Each has its own icon and list, accented in the theme's
 * brand color (`data-domain` sets --dom, see simulation.module.scss).
 */
export type SimDomain = 'chiller' | 'fab';

export const DOMAIN_PARAM = 'domain';

export const DOMAINS: Record<
  SimDomain,
  { label: string; title: string; model: string; kinds: SimJobKind[]; icon: ReactNode }
> = {
  chiller: {
    label: 'Chiller Plant',
    title: 'Chiller plant simulation',
    model: 'CUB chiller plant model',
    kinds: ['scenario', 'doe'],
    icon: <TempCold />,
  },
  fab: {
    label: 'Fab Production',
    title: 'Fab production simulation',
    model: 'FAB1 production model',
    kinds: ['production'],
    icon: <HardwareChip />,
  },
};

export const domainOf = (kind: SimJobKind): SimDomain =>
  kind === 'production' ? 'fab' : 'chiller';

/** "CHILLER PLANT SIMULATION · CUB chiller plant model" at the top of a job or a form */
export const DomainBanner = ({ domain, children }: { domain: SimDomain; children?: ReactNode }) => (
  <div className={styles.banner} data-domain={domain}>
    <span className={styles.banner__icon}>{DOMAINS[domain].icon}</span>
    <span className={styles.banner__label}>{DOMAINS[domain].title}</span>
    <span className={styles.banner__model}>{DOMAINS[domain].model}</span>
    {children ? <span className={styles.banner__extra}>{children}</span> : null}
  </div>
);
