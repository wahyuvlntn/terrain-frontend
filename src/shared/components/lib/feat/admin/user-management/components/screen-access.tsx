import { SaveFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ScreenSearchDesktopIcon } from '@digital-twin/reusables';

import { Button, Checkbox } from '../../../../input';
import { useScreenAccess } from './screen-access.hooks';
import styles from './screen-access.module.scss';

const ScreenAccess = (props: {
  type: string;
  value: string | null;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
}) => {
  const { permissions, updatePermission, handleSubmit, aliasToNameMapping } = useScreenAccess(
    props.type,
    props.value
  );

  // console.log(Object.entries(permissions))
  return (
    <>
      <div className={styles['title-container']}>
        <div className={styles['title']}>
          <ScreenSearchDesktopIcon width={24} height={24} />
          <div>{t('common.screen_list')}</div>
        </div>
      </div>
      <div className={styles['screen-list']}>
        <div className={styles['screens']}>
          {Object.entries(permissions).map(([groupAlias, perms]) =>
            aliasToNameMapping[groupAlias] ? (
              <div className={styles['screen']} key={groupAlias}>
                <div className={styles['screen-name']}>{aliasToNameMapping[groupAlias]}</div>
                <div className={styles['authorization-list']}>
                  {Object.entries(perms).map(([permAlias, value], index) => (
                    <div className={styles['check-item']} key={permAlias}>
                      <label htmlFor={groupAlias + permAlias + index.toString()}>
                        {t(`common.${permAlias}`)}
                      </label>
                      <Checkbox
                        disabled={props.type === 'USER'}
                        value={value}
                        onChange={() => updatePermission(groupAlias, permAlias)}
                        id={groupAlias + permAlias + index.toString()}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
      {props.type === 'USER_GROUP' && (
        <div className={styles['buttons']}>
          <Button
            color="default-secondary"
            onClick={(e) => {
              e.preventDefault();
              props.setSelected({
                type: '',
                value: null,
              });
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button color="default-primary" icon={<SaveFill />} onClick={handleSubmit}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </>
  );
};

export default ScreenAccess;
