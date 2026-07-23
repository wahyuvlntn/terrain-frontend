import { Plus, Search } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import { Button, Container, Input } from '../../../../../index';
import { ListType } from '../api/master.api';
import { ReorderItem } from './reorder-item';
import styles from './reorderable-list.module.scss';

interface ReorderableList {
  hasCreate: boolean;
  hasRead: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  title: string;
  selectedItem: number | null;
  icon: React.ReactNode;
  selectedDraggedList: ListType;
  selectedListRef: React.MutableRefObject<HTMLDivElement | null>;
  listContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  inputDisabled: boolean;
  searchInputValue?: string | number | readonly string[] | undefined;
  list: ListType[];
  reorderEnabled: boolean;
  isDragging: boolean;
  editable: boolean;
  onSearchInputChange?: React.ChangeEventHandler<HTMLInputElement> | undefined;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  handleCancelSelection: () => Promise<void>;
  handleChangeOrder: (orderId: string, id: string) => Promise<void>;
  onDragStart: (
    id: string,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
  onItemSelect?: (id: string) => void;
}

export function ReorderableList({
  hasCreate,
  hasRead,
  hasUpdate,
  hasDelete,
  title,
  icon,
  reorderEnabled,
  searchInputValue,
  selectedItem,
  selectedDraggedList,
  selectedListRef,
  listContainerRef,
  list,
  isDragging,
  inputDisabled,
  editable,
  onDragStart,
  handleCancelSelection,
  handleChangeOrder,
  onSearchInputChange,
  onEdit,
  onDelete,
  onAdd,
  onItemSelect,
}: ReorderableList) {
  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const targetElement = selectedListRef.current as HTMLDivElement;
    if (selectedListRef.current && listContainerRef.current) {
      const minY = listContainerRef.current.offsetTop;
      const maxY =
        listContainerRef.current.offsetTop +
        listContainerRef.current.clientHeight -
        targetElement.getBoundingClientRect().height / 2;

      const y = event.clientY;
      const yTop =
        event.clientY - targetElement.getBoundingClientRect().height / 2;
      const yBot =
        event.clientY + targetElement.getBoundingClientRect().height / 2;

      if (yTop <= minY) {
        targetElement.style.top = `${minY}px`;
      } else if (
        yBot - targetElement.getBoundingClientRect().height / 2 >=
        maxY
      ) {
        targetElement.style.top = `${
          maxY - targetElement.getBoundingClientRect().height / 2
        }px`;
      } else {
        targetElement.style.top = `${
          y - targetElement.getBoundingClientRect().height / 2
        }px`;
      }

      targetElement.style.position = 'absolute';
    }
  };
  return (
    <Container
      onMouseMove={(e) => {
        isDragging && handleMouseMove(e);
      }}
      className={styles['data-list-container']}
      title={title}
      icon={icon}
      background={'none'}
    >
      {editable && (
        <div className={styles['data-list-action']}>
          <Input
            disabled={inputDisabled}
            onChange={onSearchInputChange}
            value={searchInputValue}
            wrapperProps={{
              style: { width: '100%' },
              className: styles.search,
            }}
            suffix={<Search />}
            placeholder={t('common.search')}
          />
          {hasCreate && (
            <Button
              disabled={inputDisabled}
              icon={<Plus style={{ height: 20, width: 20 }} />}
              className={styles['add-button']}
              onClick={onAdd}
              color={'default-secondary'}
              style={{ whiteSpace: 'nowrap' }}
            >
              {t('common.add')}
            </Button>
          )}
        </div>
      )}
      <div
        ref={listContainerRef}
        onMouseUp={() => {
          isDragging && handleCancelSelection();
        }}
        onMouseLeave={() => {
          isDragging && handleCancelSelection();
        }}
        style={{ cursor: isDragging ? 'grabbing' : 'auto' }}
        className={styles['list']}
      >
        {list
          .sort((a, b) => a.order_id - b.order_id)
          .map((category) => (
            <ReorderItem
              hasCreate={hasCreate}
              hasRead={hasRead}
              hasUpdate={hasUpdate}
              hasDelete={hasDelete}
              visible={category.visible ?? true}
              isDragging={isDragging}
              reorderEnabled={reorderEnabled}
              editable={editable}
              onSelect={onDragStart}
              onChange={handleChangeOrder}
              onEdit={onEdit}
              onDelete={onDelete}
              id={category.id.toString()}
              orderId={category.order_id.toString()}
              key={category.id}
              label={category.name}
              isSelected={selectedItem === category.id}
              onClick={onItemSelect}
            />
          ))}
      </div>
      <div
        ref={selectedListRef}
        className={styles['custom-list']}
        style={{
          width:
            listContainerRef && listContainerRef.current
              ? listContainerRef.current.getBoundingClientRect().width - 20
              : 0,
          display: 'none',
          alignItems: 'center',
          pointerEvents: 'none',
          opacity: 0.8,
        }}
      >
        <span
          style={{
            marginLeft: 12,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedDraggedList?.name}
        </span>
      </div>
    </Container>
  );
}
