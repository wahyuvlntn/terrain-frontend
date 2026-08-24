import {
  CustomTreeItem,
  FilterItem,
  INSTRUCTION_TYPE_NAME,
  InstructionTypeEnum,
  useCoreFilter,
  useCoreFilterClient,
} from '@digital-twin/components';
import { t } from '@digital-twin/utils';

export const FILTER_INSTRUCTION_TYPE_KEY = 'instructionTypeIds';
export const FILTER_SEARCH_PARAMS_PARSER_INSTRUCTION_TYPE = Number;

export const InstructionTypeShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const selected = filterData[FILTER_INSTRUCTION_TYPE_KEY];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [FILTER_INSTRUCTION_TYPE_KEY]: [],
    }));

  if (selected?.length === 0) return null;

  const name =
    selected === null
      ? `Instruction Type: ${t('common.all')}`
      : `Instruction Type: ${selected.map((id) => INSTRUCTION_TYPE_NAME[id as keyof typeof INSTRUCTION_TYPE_NAME]).join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const InstructionTypeTree = () => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } = useCoreFilter({
    data: Object.keys(InstructionTypeEnum.Enum).map((key) => ({
      id: key,
      name: INSTRUCTION_TYPE_NAME[
        InstructionTypeEnum.Enum[key as keyof typeof InstructionTypeEnum.Enum]
      ],
    })),
    key: FILTER_INSTRUCTION_TYPE_KEY,
  });

  return (
    <CustomTreeItem
      nodeId={'instruction-type-root'}
      label={'Instruction Type'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((type) => (
        <CustomTreeItem
          key={type.id}
          nodeId={String(type.id)}
          label={type.name}
          checked={type.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};
