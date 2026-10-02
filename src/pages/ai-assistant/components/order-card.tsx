import { MAINTENANCE_STATUS_COLOR } from '@digital-twin/components';
import { MOrder } from '@digital-twin/icons';
import { format } from 'date-fns';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { assistantStore } from '../ai-assistant.store';
import { MaintenanceOrderCard } from '../api/ai-assistant.api';
import styles from './form-card.module.scss';

const STATUS_LABEL: Record<string, keyof typeof MAINTENANCE_STATUS_COLOR> = {
  REQUESTED: 'Requested',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  DONE: 'Done',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const when = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The order's place on the Maintenance Order page: its day in the list, selected */
export const orderLink = (order: MaintenanceOrderCard) => {
  const start = when(order.plannedStart);
  const day = start ? format(start, 'yyyy-MM-dd') : null;
  return `/maintenance-order?view=list&page=1&tab=details&add=false${day ? `&start=${day}&end=${day}` : ''}&selected=${order.id}`;
};

/** A maintenance order after the assistant (or a form the user submitted) acted on it */
export const OrderCard = memo(({ order }: { order: MaintenanceOrderCard }) => {
  const navigate = useNavigate();
  const deleted = order.status === 'DELETED';
  const status = STATUS_LABEL[order.status];
  const start = when(order.plannedStart);
  const end = when(order.plannedEnd);
  const facts = [
    order.equipment
      ? `${order.equipment.replace(/_/g, '-')}${order.equipmentName ? ` · ${order.equipmentName}` : ''}`
      : null,
    [
      order.type,
      order.severity && `${order.severity} severity`,
      order.priority && `${order.priority} priority`,
    ]
      .filter(Boolean)
      .join(' · ') || null,
    start
      ? `${format(start, 'd MMM yyyy HH:mm')}${end ? ` – ${format(end, start.toDateString() === end.toDateString() ? 'HH:mm' : 'd MMM HH:mm')}` : ''}`
      : null,
    order.technicians.length ? `Technicians: ${order.technicians.join(', ')}` : null,
    order.occurrences ? `${order.occurrences} occurrences` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={styles.order} role="group" aria-label={`Maintenance order ${order.name}`}>
      <span className={styles.order__icon} aria-hidden="true">
        <MOrder />
      </span>
      <div className={styles.order__body}>
        <div className={styles.order__head}>
          <strong>{order.name}</strong>
          {status ? (
            <span
              className={styles.status}
              style={{ ['--status' as string]: MAINTENANCE_STATUS_COLOR[status] }}
            >
              {status}
            </span>
          ) : null}
          {order.action ? <span className={styles.order__action}>{order.action}</span> : null}
        </div>
        {!deleted
          ? facts.map((f) => (
              <span key={f} className={styles.order__fact} title={f}>
                {f}
              </span>
            ))
          : null}
      </div>
      {!deleted ? (
        <button
          type="button"
          className={styles.open}
          title="Open on the Maintenance Order page"
          onClick={() => {
            navigate(orderLink(order));
            assistantStore.setOpen(false);
          }}
        >
          Open
        </button>
      ) : null}
    </div>
  );
});
OrderCard.displayName = 'OrderCard';
