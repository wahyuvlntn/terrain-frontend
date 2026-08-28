import styles from './frequent-issue-item.module.scss';

interface FrequentIssueItemProps {
  title: string;
  description: string;
  value: number;
}

const FrequentIssueItem = ({ description, title, value }: FrequentIssueItemProps) => {
  return (
    <div className={styles['frequent-issue-item']}>
      <div className={styles['title-container']}>
        <span title={title} className={styles['title']}>
          {title}
        </span>
        <span title={description} className={styles['description']}>
          {description}
        </span>
      </div>
      <div className={styles['value-container']}>
        <span className={styles['value']}>{value}</span>
      </div>
    </div>
  );
};

export default FrequentIssueItem;
