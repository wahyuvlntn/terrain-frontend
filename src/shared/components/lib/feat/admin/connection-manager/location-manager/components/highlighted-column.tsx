import { COLOR } from '../../../../../../index';

interface HighlightedColumnProps {
  labels: {
    label: string;
    value: string;
    color: string;
    width: number;
    radius: number | string;
    isActive?: boolean | null;
  }[];
}

export default function HighlightedColumn({ labels }: HighlightedColumnProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        justifyContent: 'center',
        alignItems: 'flexStart',
        textAlign: 'center',
      }}
    >
      {labels.map((label, idx) => (
        <span
          key={idx}
          style={{
            backgroundColor:
              label.value === 'Not Licensed'
                ? COLOR.statusOfflineSecondary
                : label.isActive
                ? label.color
                : COLOR.conditionCriticalPrimary,
            width: label.width,
            borderRadius: label.radius,
            color: '#FFFFFF',
            padding: '6px 0px 6px 0px',
          }}
        >
          {label.label}
        </span>
      ))}
    </div>
  );
}
