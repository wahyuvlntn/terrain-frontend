import {
  Button,
  Container,
  Filter,
  FilterDrawer,
  FilterDrawerShortcuts,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  FilterTree,
  InfoTooltip,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
  Search,
} from '@digital-twin/components';
import { ListAlt, Plus } from '@digital-twin/icons';
import clsx from 'clsx';
import { Link, Outlet } from 'react-router-dom';

import { AppPagination } from '../../../shared/components/lib/navigation/app-pagination';
import { TypeShortcut, TypeTree } from '../../../components';
import { InstructionCard } from './instruction-card';
import { useInstructionList } from './instruction-list.hook';
import styles from './instruction-list.module.scss';
import { InstructionTypeShortcut, InstructionTypeTree } from './instruction-type-filter';

const InstructionListTooltip = () => {
  return (
    <InfoTooltip
      title={'Instruction List'}
      className={styles.InstructionListTooltip}
      content={
        <div className={styles.InstructionListTooltip__Content}>
          <div className={styles.InstructionListTooltip__InnerContent}>
            <span>
              Browse and manage the library of maintenance instructions for each equipment model.
            </span>
            <span>
              Use filters and search to find specific procedures, then open a card to view, edit, or
              duplicate the instruction.
            </span>
          </div>
          <span>Some actions may be read-only depending on your role and permission level.</span>
        </div>
      }
    />
  );
};

export const InstructionList = () => {
  const {
    instructionList,
    filter,
    handlePageChange,
    handleSearchChange,
    maxPage,
    hasCreatePermission,
  } = useInstructionList();

  return (
    <div className={styles.InstructionList}>
      <Filter
        onDataChange={filter.handleFilterDataChange}
        setFilter={filter.setFilter}
        data={filter.data}
        isReady={filter.isReady}
        page={filter.page}
        search={filter.search}
      >
        <div className={styles.InstructionList__Header}>
          <div className={'ribbon-item'}>
            <FilterShortcutContainer>
              <FilterDrawerToggleButton />
              <FilterShortcut>
                <LocationShortcut />
                <ModelShortcut />
                <TypeShortcut />
                <InstructionTypeShortcut />
              </FilterShortcut>
            </FilterShortcutContainer>
            <FilterDrawer>
              <FilterDrawerShortcuts>
                <LocationShortcut />
                <ModelShortcut />
                <TypeShortcut />
                <InstructionTypeShortcut />
              </FilterDrawerShortcuts>
              <FilterTree>
                <ModelTree />
                <TypeTree />
                <InstructionTypeTree />
              </FilterTree>
            </FilterDrawer>
          </div>

          <Search
            placeholder={'Search...'}
            width={235}
            value={filter.search}
            onChange={handleSearchChange}
          />
        </div>
      </Filter>
      <div className={styles.InstructionList__Body}>
        <Container
          title={'Instruction List'}
          icon={<ListAlt />}
          titleSuffixIcon={<InstructionListTooltip />}
          rightTopComponent={
            hasCreatePermission ? (
              <Link to={'/maintenance-instruction/new'}>
                <Button>
                  <Plus />
                  <span className={styles.AddBtnLong}>New Instruction</span>
                  <span className={styles.AddBtnShort}>New</span>
                </Button>
              </Link>
            ) : null
          }
          contentWrapperProps={{
            style: {
              alignItems: 'center',
              padding: 16,
              borderRadius: 8,
            },
          }}
          className={clsx(styles.InstructionList__ListOuterContainer)}
        >
          <div className={styles.InstructionList__ListInnerContainer}>
            {instructionList?.data?.map((instruction) => (
              <InstructionCard key={instruction.id} {...instruction} />
            ))}
          </div>
          <AppPagination page={filter.page} max={maxPage || 1} onChange={handlePageChange} />
        </Container>
        <Outlet
          context={{
            setFilter: filter.setFilter,
          }}
        />
      </div>
    </div>
  );
};
