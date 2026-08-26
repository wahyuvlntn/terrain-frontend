import { Checkbox, Popup, Search } from '@digital-twin/components';
import { DragIndicator } from '@digital-twin/icons';
import { SettingsIcon } from '@digital-twin/reusables';
import { convertToPascalCase, t } from '@digital-twin/utils';
import { useEffect, useMemo, useState } from 'react';
import styles from './issue-selector.module.scss';

interface IssueOption {
  value: string;
  label: string;
  is_diagnostic?: boolean;
  is_repair?: boolean;
}

interface IssueSelectorProps {
  open: boolean;
  onClose: () => void;
  relatedIssueOptions?: IssueOption[];
  nonRelatedIssueOptions?: IssueOption[];
  issueMasterData?: IssueOption[];
  value?: string[];
  onApply?: (value: string[]) => void;
  mainIssues: {
    value: string;
    label: string;
    is_diagnostic: boolean;
    is_repair: boolean;
  }[];
}

export const IssueSelector = ({
  open,
  onClose,
  relatedIssueOptions = [],
  nonRelatedIssueOptions = [],
  issueMasterData = [],
  value = [],
  onApply,
  mainIssues = [],
}: IssueSelectorProps) => {
  // Convert mainIssues to values for filtering
  const mainIssueValues = useMemo(() => mainIssues.map((issue) => issue.value), [mainIssues]);

  // Initialize selected state without any main issues
  const [selected, setSelected] = useState<string[]>(() =>
    value.filter((v) => !mainIssueValues.includes(v))
  );
  const [search, setSearch] = useState('');

  // Sync selected state when popup opens with value prop
  useEffect(() => {
    if (open) {
      setSelected(value.filter((v) => !mainIssueValues.includes(v)));
    }
  }, [open, value, mainIssueValues]);

  // Convert mainIssues to a record for quick lookup (these cannot be changed)
  const mainIssuesRecord = useMemo(() => {
    const record: Record<string, boolean> = {};
    for (const issue of mainIssues) {
      record[issue.value] = true;
    }
    return record;
  }, [mainIssues]);

  // Convert selected array to a record for quick lookup
  const selectedRecord = useMemo(() => {
    const record: Record<string, boolean> = {};
    for (const v of selected) {
      record[v] = true;
    }
    return record;
  }, [selected]);

  // Combine all options for label lookup
  const allOptions = useMemo(() => {
    return [...relatedIssueOptions, ...nonRelatedIssueOptions];
  }, [relatedIssueOptions, nonRelatedIssueOptions]);

  // Convert options to a record for quick lookup
  const optionLabelsRecord = useMemo(() => {
    const record: Record<string, IssueOption> = {};
    for (const option of issueMasterData) {
      record[option.value] = option;
    }
    return record;
  }, [issueMasterData]);

  // Map selected values to options, preserving the order of selected array and excluding mainIssues
  const selectedOptions = useMemo(() => {
    return selected
      .filter((value) => !mainIssuesRecord[value])
      .map((value) => ({
        value,
        label: optionLabelsRecord[value]?.label ?? value,
        is_diagnostic: optionLabelsRecord[value]?.is_diagnostic,
        is_repair: optionLabelsRecord[value]?.is_repair,
      }));
  }, [selected, optionLabelsRecord, mainIssuesRecord]);

  // Filter related options by search input and exclude mainIssues
  const filteredRelatedOptions = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return relatedIssueOptions.filter(
      (option) =>
        !selectedRecord[option.value] &&
        !mainIssuesRecord[option.value] &&
        (option.label ?? option.value).toLowerCase().includes(normalizedSearch)
    );
  }, [relatedIssueOptions, selectedRecord, mainIssuesRecord, search]);

  // Filter non-related options by search input and exclude mainIssues
  const filteredNonRelatedOptions = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return nonRelatedIssueOptions.filter(
      (option) =>
        !selectedRecord[option.value] &&
        !mainIssuesRecord[option.value] &&
        (option.label ?? option.value).toLowerCase().includes(normalizedSearch)
    );
  }, [nonRelatedIssueOptions, selectedRecord, mainIssuesRecord, search]);

  const handleApply = () => {
    onApply?.(selected);
    onClose();
  };

  console.log(selected);

  return (
    <Popup
      open={open}
      onClose={onClose}
      onSubmit={handleApply}
      title="Select Other Possible Issues"
      icon={<SettingsIcon width={24} height={24} />}
      width={720}
      background="none"
      variant="apply"
    >
      <div className={styles['issue-selector']}>
        {/* Main Issues Card */}
        {mainIssues.length > 0 && (
          <div className={styles['issue-selector__main-card']}>
            {mainIssues.map((issue) => (
              <div key={issue.value} className={styles['issue-selector__main-item']}>
                <span>• {issue.label}</span>
                {issue.is_diagnostic && (
                  <span className={styles['issue-selector__tag--diagnosis']}>
                    {convertToPascalCase('DIAGNOSIS')}
                  </span>
                )}
                {issue.is_repair && (
                  <span className={styles['issue-selector__tag--repair']}>
                    {convertToPascalCase('REPAIR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <span className={styles['issue-selector__hint']}>
          Select any issues that may also be related to this case.
        </span>

        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          wrapperClassName={styles['issue-selector__search']}
        />

        {/* Selected Other Possible Issues */}
        <div className={styles['issue-selector__section']}>
          <span className={styles['issue-selector__label']}>
            Selected Other Possible Issues:{' '}
            <span className={styles['issue-selector__required']}>*</span>
          </span>
          {selectedOptions.length > 0 ? (
            <div className={styles['issue-selector__list']}>
              {selectedOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={styles['issue-selector__selected-item']}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text', index.toString());
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    const droppedIndex = e.dataTransfer.getData('text');
                    setSelected((prev) => swapByIndex(prev, index, Number(droppedIndex)));
                  }}
                >
                  <DragIndicator className={styles['issue-selector__drag-indicator']} />
                  <Checkbox
                    label={`${String.fromCharCode(65 + index)}. ${option.label}`}
                    value={true}
                    onChange={() => {
                      setSelected((prev) => prev.filter((v) => v !== option.value));
                    }}
                  />
                  {option.is_diagnostic && (
                    <span className={styles['issue-selector__tag--diagnosis']}>
                      {convertToPascalCase('DIAGNOSIS')}
                    </span>
                  )}
                  {option.is_repair && (
                    <span className={styles['issue-selector__tag--repair']}>
                      {convertToPascalCase('REPAIR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className={styles['issue-selector__placeholder']}>
              No issues have been selected yet
            </span>
          )}
        </div>

        <hr className={styles['issue-selector__separator']} />

        {/* Related Issue List */}
        <div className={styles['issue-selector__section']}>
          <span className={styles['issue-selector__label']}>Related Issue List:</span>
          <div className={styles['issue-selector__list']}>
            {filteredRelatedOptions.map((option) => (
              <div key={option.value} className={styles['issue-selector__list-item']}>
                <Checkbox
                  label={option.label}
                  value={false}
                  onChange={() => {
                    setSelected((prev) => [...prev, option.value]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Non Related Issue List */}
        <div className={styles['issue-selector__section']}>
          <span className={styles['issue-selector__label']}>Non Related Issue List:</span>
          <div className={styles['issue-selector__list']}>
            {filteredNonRelatedOptions.map((option) => (
              <div key={option.value} className={styles['issue-selector__list-item']}>
                <Checkbox
                  label={option.label}
                  value={false}
                  onChange={() => {
                    setSelected((prev) => [...prev, option.value]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Popup>
  );
};

function swapByIndex(arr: string[], i: number, j: number): string[] {
  const copy = [...arr]; // avoid mutating original
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
