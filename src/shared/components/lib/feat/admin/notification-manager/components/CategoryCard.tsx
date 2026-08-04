/* eslint-disable simple-import-sort/imports */
import styles from '../styles.module.scss';
import { Checkbox, COLOR } from '@digital-twin/components';

interface CategoryCardProps {
  id: number /* Category id */;
  category: string /* Category name */;
  isSelected: boolean;
  handleToggleSelectCategory: (
    id: number
  ) => void /* Handle select/unselect category card */;
}

const CategoryCard = ({
  id,
  category,
  isSelected,
  handleToggleSelectCategory,
}: CategoryCardProps) => {
  return (
    <div className={styles['category-card']} style={{
      background: isSelected ? COLOR.backgroundHigh  : undefined,
      border: isSelected ? '2px solid ' + COLOR.backgroundHighest : undefined
    }}>
      <div>{category}</div>
      <Checkbox
        value={isSelected}
        onClick={() => handleToggleSelectCategory(id)}
      />
    </div>
  );
};

export default CategoryCard;
