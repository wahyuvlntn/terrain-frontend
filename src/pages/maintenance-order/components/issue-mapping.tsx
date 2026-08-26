import { Button, COLOR, Loading, useExtractFilter } from '@digital-twin/components';
import { Edit2 } from '@digital-twin/icons';
import { convertToPascalCase } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { getOtherPossibleIssues, MaintenanceInstructionType } from '../api/maintenance-order';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';
import styles from './issue-mapping.module.scss';
import { IssueSelector } from './issue-selector';

export const IssueMapping = ({
  issueMasterData,
  issues,
  otherIssues,
  onChange,
  disabled,
}: {
  issueMasterData: MaintenanceInstructionType[];
  onChange: (value: string[]) => void;
  issues: string[];
  otherIssues: string[];
  disabled?: boolean;
}) => {
  const { filter } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();
  const [openPopup, setOpenPopup] = useState(false);
  const maintenance_id = Number(filter.selected);
  const otherPossibleIssues = useQuery({
    queryKey: ['get-other-possible-issues', maintenance_id],
    queryFn: () => {
      return getOtherPossibleIssues({
        maintenance_id,
      });
    },
    enabled: !!maintenance_id,
  });
  const relatedIssueOptions = useMemo(() => {
    return issueMasterData.filter((option) =>
      otherPossibleIssues.data?.some((issue) => String(issue.id) === option.value)
    );
  }, [JSON.stringify(issueMasterData), JSON.stringify(otherPossibleIssues.data)]);
  const nonRelatedIssueOptions = useMemo(() => {
    return issueMasterData.filter(
      (option) => !otherPossibleIssues.data?.some((issue) => String(issue.id) === option.value)
    );
  }, [JSON.stringify(issueMasterData), JSON.stringify(otherPossibleIssues.data)]);

  const mainIssues = useMemo(() => {
    const data: MaintenanceInstructionType[] = [];
    issues.forEach((issue) => {
      const foundIssue = issueMasterData.find((issueMaster) => issueMaster.value === issue);
      if (foundIssue) data.push(foundIssue);
    });
    return data;
  }, [JSON.stringify(issueMasterData), JSON.stringify(issues)]);

  const otherIssuesMap = useMemo(() => {
    const data: MaintenanceInstructionType[] = [];
    otherIssues.forEach((issue) => {
      const foundIssue = issueMasterData.find((issueMaster) => issueMaster.value === issue);
      if (foundIssue) data.push(foundIssue);
    });
    return data;
  }, [JSON.stringify(issueMasterData), JSON.stringify(otherIssues)]);

  return (
    <div className={styles['issue-mapping']}>
      <Loading isLoading={otherPossibleIssues.isFetching} />
      <div>Issue Mapping:</div>
      <div className={styles['container']}>
        <div className={styles['main-issues']}>
          {issueMasterData
            .filter((issueFilter) => issues.includes(issueFilter.value))
            .map((issue, index) => (
              <div className={styles['issue']}>
                <div className={styles['no']}>{index + 1}.</div>
                <div>{issue.label}</div>
                {issue.is_diagnostic && <RenderIssueType type="DIAGNOSIS" />}
                {issue.is_repair && <RenderIssueType type="REPAIR" />}
              </div>
            ))}
        </div>
        <div className={styles['other-issues-header']}>
          <div>Other Possible Issues</div>
          {!disabled && (
            <Button icon={<Edit2 />} onClick={() => setOpenPopup(true)}>
              Edit
            </Button>
          )}
        </div>
        <div className={styles['other-issues']}>
          {otherIssuesMap.map((issue, index) => (
            <>
              <TreeItem
                number={index + 1 + issues.length}
                label={issue.label}
                types={[issue.is_diagnostic ? 'DIAGNOSIS' : '', issue.is_repair ? 'REPAIR' : '']}
                viewTreeBranchBottom={index !== otherIssuesMap.length - 1}
                isAdditional={
                  !relatedIssueOptions.some((relIssue) => relIssue.value === issue.value)
                }
              />
              {index !== otherIssuesMap.length - 1 && <div className={styles['tree-connector']} />}
            </>
          ))}
        </div>
      </div>
      <IssueSelector
        open={openPopup}
        onClose={() => setOpenPopup(false)}
        relatedIssueOptions={relatedIssueOptions}
        nonRelatedIssueOptions={nonRelatedIssueOptions}
        issueMasterData={issueMasterData}
        value={otherIssues}
        onApply={(values) => {
          onChange(values);
        }}
        mainIssues={mainIssues}
      />
    </div>
  );
};

const TreeItem = ({
  number,
  label,
  types,
  viewTreeBranchBottom,
  isAdditional,
}: {
  number: number;
  label: string;
  types: ('DIAGNOSIS' | 'REPAIR' | '')[];
  viewTreeBranchBottom: boolean;
  isAdditional: boolean;
}) => {
  return (
    <div className={styles['tree-item']}>
      <div className={styles['tree-branch']}>
        <div className={styles['tree-branch__top']} />
        <div
          className={styles['tree-branch__bottom']}
          style={{ border: viewTreeBranchBottom ? '' : 'none' }}
        />
      </div>
      <div className={styles['tree-item-content']}>
        <div className={styles['no']}>{number}.</div>
        <div>{label}</div>
        {types.map((type) => (
          <RenderIssueType key={type} type={type} />
        ))}
        {isAdditional && (
          <div className={styles['additional-issue-flag']}>
            <span style={{ color: COLOR.conditionCriticalPrimary }}>*</span>
            Added Issue
          </div>
        )}
      </div>
    </div>
  );
};

const RenderIssueType = ({ type }: { type: 'DIAGNOSIS' | 'REPAIR' | '' }) => {
  return (
    !!type && (
      <div
        className={`${styles['issue-type']} ${
          type === 'DIAGNOSIS'
            ? styles['issue-type--diagnosis']
            : type === 'REPAIR'
              ? styles['issue-type--repair']
              : ''
        }`}
      >
        {convertToPascalCase(type)}
      </div>
    )
  );
};
