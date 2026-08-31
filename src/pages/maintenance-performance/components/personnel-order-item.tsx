import styles from './personnel-order-item.module.scss';

interface PersonnelOrderItem {
  title: string;
  description: string;
  value: number;
  onClick: (name: string) => void;
}

const PersonnelOrderItem = ({ description, title, value, onClick }: PersonnelOrderItem) => {
  return (
    <div className={styles['personnel-order-item']} onClick={() => onClick(title)}>
      <div className={styles['title-container']}>
        <span className={styles['title']}>{title}</span>
        <span className={styles['description']}>{description}</span>
      </div>
      <div className={styles['value-container']}>
        <span className={styles['value']}>{value}</span>
      </div>
    </div>
  );
};

export default PersonnelOrderItem;
