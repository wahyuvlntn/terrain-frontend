import { Badge } from '@digital-twin/components';
import { ChevronRightFill } from '@digital-twin/icons';

import styles from '../digital-twin.module.scss';
import { TwinNode } from '../digital-twin.types';

const SHOWN_KEYS = [
  'dt_tag',
  'dt_type',
  'dt_description',
  'dt_unit',
  'dt_location_type',
  'dt_name',
  'dt_group',
  'dt_schema',
  'dt_level',
];

const pretty = (key: string) => {
  const s = key.replace(/^dt_/, '').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const LOCATION_LABELS: Record<string, string> = {
  location: 'Location',
  scene: '3D scene · not linked',
  group: 'Group',
};

const kindLabel = (node: TwinNode) => {
  if (node.kind === 'location') {
    const label = LOCATION_LABELS[String(node.props.dt_location_type)] ?? 'Location';
    return node.props.dt_level !== undefined ? `${label} · Level ${node.props.dt_level}` : label;
  }
  if (node.kind === 'equipment') return 'Equipment';
  if (node.kind === 'group') return 'Subsystem';
  return node.props.dt_component === 'instrument' ? 'Instrument' : 'Component';
};

const childrenTitle: Record<TwinNode['kind'], string> = {
  location: 'Contains',
  equipment: 'Subsystems',
  group: 'Components',
  part: '',
};

type TwinDetailsProps = {
  node?: TwinNode;
  /** live data binding of the node, e.g. "CH_01 · chwst" */
  binding?: string | null;
  onSelect: (id: string) => void;
};

export const TwinDetails = ({ node, binding, onSelect }: TwinDetailsProps) => {
  if (!node) return <div className={styles['twin-details__empty']}>Select a location or part</div>;

  const { dt_tag, dt_type, dt_description, dt_unit } = node.props;
  const extra = Object.entries(node.props).filter(
    ([k, v]) => !SHOWN_KEYS.includes(k) && v !== undefined && v !== ''
  );
  const isMeasured = node.kind === 'part' && !!dt_unit;

  return (
    <div className={styles['twin-details']}>
      <div className={styles['twin-details__kind']}>{kindLabel(node)}</div>
      <div className={styles['twin-details__name']}>{node.name}</div>
      {dt_tag ? (
        <Badge color="secondary" className={styles['twin-details__tag']}>
          {String(dt_tag)}
        </Badge>
      ) : null}
      {dt_description ? (
        <p className={styles['twin-details__desc']}>{String(dt_description)}</p>
      ) : null}

      {dt_type || extra.length || binding || isMeasured || node.kind === 'equipment' ? (
        <dl className={styles['twin-details__props']}>
          {binding || isMeasured || node.kind === 'equipment' ? (
            <div className={styles['twin-details__prop']}>
              <dt>Live data</dt>
              <dd>{binding ?? 'Not bound'}</dd>
            </div>
          ) : null}
          {dt_type ? (
            <div className={styles['twin-details__prop']}>
              <dt>Type</dt>
              <dd>{pretty(String(dt_type))}</dd>
            </div>
          ) : null}
          {extra.map(([k, v]) => (
            <div key={k} className={styles['twin-details__prop']}>
              <dt>{pretty(k)}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {node.children.length ? (
        <>
          <div className={styles['panel__title']}>
            {childrenTitle[node.kind]} ({node.children.length})
          </div>
          <ul className={styles['twin-details__children']}>
            {node.children.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onSelect(c.id)}>
                  <span>{c.name}</span>
                  {c.props.dt_tag && c.kind !== 'equipment' ? (
                    <em>{String(c.props.dt_tag)}</em>
                  ) : null}
                  <ChevronRightFill />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
};
