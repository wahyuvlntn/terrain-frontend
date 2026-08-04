import { Edit1, TrashDelete } from '@digital-twin/icons';
import {
  createTranslationKey,
  t,
  useLanguageSwitcher,
  useVerticalLimit,
} from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Column, Table } from '../../../../data';
import { useToggle } from '../../../../hooks';
import { Pagination } from '../../../../navigation';
import { Loading, PopupDelete } from '../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../auth';
import { LicenseStatus as LicenseStatusComponent } from '../../connection-manager/model-manager/components/license-status';
import { LicenseType as LicenseTypeComponent } from '../../connection-manager/model-manager/components/license-type';
import { useDeleteLicense, useLicenses } from '../hooks';
import { LicenseType } from '../schemas';
import style from './license-table.module.scss';
import { UpdateLicenseDrawer } from './update-license-drawer';

// Constants
const ITEM_HEIGHT = 45;
const OFFSET = 44;

export const LicenseTable = () => {
  const { currentLanguage } = useLanguageSwitcher();

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.licensemanager,
    PermissionAliasEnum.enum.update
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.licensemanager,
    PermissionAliasEnum.enum.delete
  );

  // For paging from url
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse the search params
  const page = useMemo(() => {
    let page = parseInt(searchParams.get('page') || '1');

    if (isNaN(page) || page <= 0) {
      page = 1;
    }

    return page;
  }, [searchParams]);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // For updating a license
  const [updatedLicense, setUpdatedLicense] = useState<LicenseType>();
  const [showUpdate, toggleShowUpdate] = useToggle(false);

  // For deleting a license
  const [deletedLicense, setDeletedLicense] = useState<LicenseType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteLicense = useDeleteLicense();

  // For fetching licenses
  const { data, isLoading } = useLicenses();

  useEffect(() => {
    if (isLoading || !limit || data?.length == null) {
      return;
    }

    const totalPage = Math.ceil(data.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete('page');
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, data?.length, limit, isLoading]);

  // Apply paging
  const pagedLicenses = useMemo(() => {
    if (!limit || !data) {
      return undefined;
    }

    return data.slice((page - 1) * limit, page * limit);
  }, [data, page, limit]);

  // Convert to rows
  const rows = useMemo(() => {
    if (!pagedLicenses) {
      return [];
    }

    return pagedLicenses.map((license) => {
      const {
        is_active,
        status_message,
        key,
        name,
        type,
        total,
        used,
        description,
        expired_at,
      } = license;

      // Calculate remaining days
      let expiredAt = '---';
      let remainingDays = '---';

      if (expired_at) {
        expiredAt = new Date(expired_at).toLocaleString();

        const remainingMs = expired_at - Date.now();

        if (remainingMs > 0) {
          remainingDays = (
            Math.round((remainingMs / (24 * 3600 * 1000)) * 100) / 100
          ).toLocaleString();
        }
      }

      return {
        id: key,
        key: key,
        name: name,
        type: <LicenseTypeComponent type={type} />,
        status: (
          <LicenseStatusComponent
            isActive={is_active}
            status={t(`common.${createTranslationKey(status_message)}`)}
          />
        ),
        description: description || '---',
        used_equipments: `${used.toLocaleString()} / ${total.toLocaleString()}`,
        remaining_days: remainingDays,
        expired_at: expiredAt,
        actions:
          hasUpdatePermission || hasDeletePermission ? (
            <div className={style['actions']}>
              {hasUpdatePermission ? (
                <Edit1
                  className={style['action']}
                  onClick={(e) => {
                    e.preventDefault();
                    setUpdatedLicense(license);
                    toggleShowUpdate();
                  }}
                />
              ) : null}

              {hasDeletePermission ? (
                <TrashDelete
                  className={style['action']}
                  onClick={(e) => {
                    e.preventDefault();
                    setDeletedLicense(license);
                    toggleShowDeleteConfirm();
                  }}
                />
              ) : null}
            </div>
          ) : undefined,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagedLicenses,
    hasUpdatePermission,
    hasDeletePermission,
    currentLanguage,
  ]);

  const columns = useMemo(() => {
    const columns: Column[] = [
      {
        key: 'status',
        name: t('common.status'),
        alignment: 'center',
        width: 120,
      },
      {
        key: 'type',
        name: t('common.license_type'),
        alignment: 'center',
        width: 120,
      },
      { key: 'key', name: t('common.license_key'), width: 250 },
      { key: 'name', name: t('common.license_name'), width: 250 },
      {
        key: 'used_equipments',
        name: t('common.license_used'),
        alignment: 'center',
        width: 150,
      },
      { key: 'description', name: t('common.description'), width: 250 },
      {
        key: 'remaining_days',
        name: t('common.remaining_days'),
        alignment: 'center',
        width: 125,
      },
      {
        key: 'expired_at',
        name: t('common.expiry_date'),
        alignment: 'center',
        width: 200,
      },
    ];

    if (hasUpdatePermission || hasDeletePermission) {
      columns.push({
        key: 'actions',
        name: t('common.action'),
        alignment: 'center',
        width: 70,
      });
    }

    return columns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUpdatePermission, hasDeletePermission, currentLanguage]);

  return (
    <>
      <div className={style['license-table-container']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        <Table width="100%" columns={columns} rows={rows} />
      </div>
      <div className={style['pagination-container']}>
        <Pagination
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          count={data?.length || 0}
          limit={limit || 1}
          variant="arrow"
        />
      </div>

      {hasDeletePermission ? (
        <PopupDelete
          entityType="License"
          entityName={deletedLicense?.name || '---'}
          open={showDeleteConfirm}
          onClose={toggleShowDeleteConfirm}
          onDelete={() => {
            if (!deletedLicense) {
              return;
            }

            deleteLicense.mutate(deletedLicense.key, {
              onSuccess: () => {
                toast.success(
                  `${t('common.license_success_deleted', deletedLicense.name)}`,
                  {
                    toastId: `success_delete_license_${deletedLicense.key}`,
                  }
                );
                toggleShowDeleteConfirm();
              },
            });
          }}
          deleting={deleteLicense.isPending}
        />
      ) : null}
      {hasUpdatePermission ? (
        <UpdateLicenseDrawer
          licenseKey={updatedLicense?.key}
          open={showUpdate}
          onClose={toggleShowUpdate}
        />
      ) : null}
    </>
  );
};
