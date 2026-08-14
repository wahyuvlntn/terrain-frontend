export type Node = {
  id?: number;
  key: string;
  name: string;
  parentKey: string;
  checked?: boolean;
};
export type NodeWithChildren = Node & {
  children: NodeWithChildren[];
};
export type TOneRootLocationOnly =
  | false
  | 'all-children'
  | 'sparse-children'
  | 'semi-sparse-children';
