import { CloudUploadFill, License } from '@digital-twin/icons';
import { useTranslate } from '@digital-twin/utils';
import { useContext } from 'react';

import { useToggle } from '../../../hooks';
import { Button } from '../../../input';
import { Container } from '../../../layout';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../auth';
import { ProjectCtx } from '../../project-ctx';
import { LicenseTable } from './components/license-table';
import { UploadLicenseDrawer } from './components/upload-license-drawer';
import { PrjCtx } from './contexts';
import style from './license-manager.module.scss';

export const LicenseManager = () => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);
  const { projectVariant: prj } = useContext(ProjectCtx);

  // Toggles
  const [showUploadForm, toggleShowUploadForm] = useToggle(false);

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.licensemanager,
    PermissionAliasEnum.enum.create
  );
  const { t } = useTranslate();
  return (
    <PrjCtx.Provider value={prj}>
      <Container
        icon={<License />}
        title={t('common.license_manager')}
        className={style['license-manager']}
        contentWrapperProps={{ style: { background: 'transparent' } }}
        rightTopComponent={
          hasCreatePermission ? (
            <Button
              icon={<CloudUploadFill />}
              onClick={(e) => {
                e.preventDefault();
                toggleShowUploadForm();
              }}
            >
              {t('common.upload')}
            </Button>
          ) : null
        }
      >
        <LicenseTable />
        {hasCreatePermission ? (
          <UploadLicenseDrawer
            open={showUploadForm}
            onClose={toggleShowUploadForm}
          />
        ) : null}
      </Container>
    </PrjCtx.Provider>
  );
};
