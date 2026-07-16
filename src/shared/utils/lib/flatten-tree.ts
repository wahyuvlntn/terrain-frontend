type TreeNode = {
  id: number;
  name: string;
  childs?: TreeNode[];
};

export function flattenTree(
  data: TreeNode[],
  parentName?: string | null
): { value: string; label: string }[] {
  const result = [];
  for (const item of data) {
    result.push({
      value: item.id.toString(),
      label: parentName ? parentName + item.name : item.name,
    });

    if (item.childs) {
      const name = parentName ? parentName : '';
      result.push(...flattenTree(item.childs, name + item.name + ';'));
    }
  }

  return result;
}
