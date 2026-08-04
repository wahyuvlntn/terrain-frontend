/* eslint-disable simple-import-sort/imports */
import { Button, Loading, Search } from '@digital-twin/components';
import styles from '../styles.module.scss';
import { SetURLSearchParams } from 'react-router-dom';
import CategoryCard from './CategoryCard';
import { useCategorytab } from './CategoryTab.hooks';
import { t } from '@digital-twin/utils';
import { SaveFill } from '@digital-twin/icons';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { UserGroupsType } from '../api/GetUserGroups';

interface CategoryTabProps {
  searchParams: URLSearchParams /* searchParams */;
  setSearchParams: SetURLSearchParams /* setSearchParams */;
  notificationAlias: string /* Notification alias */;
  refetchUserGroups: (
    options?: RefetchOptions
  ) => Promise<
    QueryObserverResult<UserGroupsType[], Error>
  > /* Refetch user groups */;
}

const CategoryTab = ({
  searchParams,
  setSearchParams,
  notificationAlias,
  refetchUserGroups,
}: CategoryTabProps) => {
  const {
    notificationCategoriesQuery /* List of notification categories */,
    isFetchingNotificationCategoriesQuery /* Loading state of notification categories */,
    isCardSelected /* Function that defines whether a card is selected or not */,
    handleToggleSelectCategory /* Handle select/unselect category card */,
    selectedCategoriesLength /* The length of selected categories */,
    handleSubmitCategories /* Categories submit handler */,
    isFetchingAssignedCategories /* Loading state of assigned categories */,
    hasUpdatePermission /* User update permission */,
  } = useCategorytab(searchParams, notificationAlias, refetchUserGroups);
  return (
    <div className={styles['category-tab']}>
      {/* Search bar */}
      <Search
        background="dark"
        width={'40%'}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        searchParamsPrefix="category-"
        placeholder="Search..."
        wrapperClassName={styles['search-category-notif']}
      />
      {/* Category and selected count */}
      <div className={styles['category-and-selected-count']}>
        <div>
          {notificationCategoriesQuery?.length || 0} {t('common.categories')}
        </div>
        <div>
          {selectedCategoriesLength} {t('common.selected')}
        </div>
      </div>
      {/* Category list */}
      <div className={styles['category-list']}>
        {/* Loading */}
        <Loading
          isLoading={
            isFetchingNotificationCategoriesQuery ||
            isFetchingAssignedCategories
          }
        />
        {
          /* Map categories */
          notificationCategoriesQuery?.map((cat) => (
            <CategoryCard
              id={cat.id}
              category={cat.category}
              isSelected={isCardSelected(cat.id)}
              handleToggleSelectCategory={handleToggleSelectCategory}
            />
          ))
        }
      </div>
      <div className={styles['save-button']}>
        {hasUpdatePermission && (
          <Button
            color="default-primary"
            icon={<SaveFill />}
            type="submit"
            onClick={handleSubmitCategories}
          >
            {t('common.save')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CategoryTab;
