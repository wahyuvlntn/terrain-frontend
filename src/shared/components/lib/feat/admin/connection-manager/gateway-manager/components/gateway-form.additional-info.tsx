// For conditional styling
import clsx from 'clsx';

// Style
import style from './gateway-form.module.scss';

export const AdditionalInfo = ({
  label,
  value,
  monospace,
}: {
  label?: string;
  value: string;
  monospace?: boolean;
}) => {
  return (
    <div className={style['additional-info']}>
      {label ? (
        <span className={style['additional-info__label']}>{label}</span>
      ) : null}
      <div className={style['additional-info__content']}>
        <input
          className={clsx(
            style['additional-info__content__preview'],
            monospace && style['additional-info__content__preview--monospace']
          )}
          value={value}
          readOnly
        />
      </div>
    </div>
  );
};
