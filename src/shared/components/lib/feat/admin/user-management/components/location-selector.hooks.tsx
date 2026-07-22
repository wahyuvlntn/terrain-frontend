/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable simple-import-sort/imports */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SelectedLocations, TreeNode } from './type';
import { useOnClickOutside } from 'usehooks-ts';

export const useLocationSelector = (
  initialLocations: SelectedLocations[],
  open: boolean,
  handleSave: (locations: SelectedLocations[]) => void,
  onClose: () => void,
  locationTree: TreeNode[]
) => {
  /* Tree data state, the initial value is the location tree passed by the props. */
  const [treeData, setTreeData] = useState<TreeNode[]>(locationTree);
  const [initLocationRender, setInitLocationRender] = useState(false);

  /* Recursive function to get certain node by its id */
  // function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  //   for (const node of nodes) {
  //     /* Base condition */
  //     if (node.id === id) {
  //       return node;
  //     }
  //     /* Recurrent condition (iterate through its children) */
  //     if (node.children) {
  //       const found = findNodeById(node.children, id);
  //       if (found) {
  //         return found;
  //       }
  //     }
  //   }
  //   return undefined;
  // }

  /* State of currently expanded nodes */
  const [expanded, setExpanded] = useState<string[]>([]);

  /* Function for handling node toggle expand */
  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  /* Track if user has interacted with the tree */
  const hasUserInteracted = useRef(false);

  /* Function for handling node toggle checkbox */
  const handleCheckboxChange = useCallback((id: string, checked: boolean) => {
    hasUserInteracted.current = true;
    /* Function to update nodes */
    const updateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        /* Base condition */
        if (node.id === id) {
          return { ...node, checked };
        }
        /* Recurrent condition */
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        /* Base condition */
        return node;
      });
    };

    /* Set the tree data based on the temporary variable */
    setTreeData((prev) => updateNode(prev));
  }, []);

  /* Function for handling node toggle checkbox, including its descendants */
  const handleDescendantsCheckboxChange = useCallback(
    (id: string, checked: boolean) => {
      hasUserInteracted.current = true;

      /* Function for handling descendants' toggle checkbox recursively */
      const updateChildrenChecked = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => ({
          ...node,
          checked /* Update its own checkbox value */,
          /* Update its children's checkbox values */
          children: node.children
            ? updateChildrenChecked(node.children)
            : undefined,
        }));
      };

      /* Function to update nodes and their parents */
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          /* Base condition */
          if (node.id === id) {
            return {
              ...node,
              checked,
              children: node.children
                ? updateChildrenChecked(node.children)
                : undefined,
            };
          }
          /* Recurrent condition */
          if (node.children) {
            const updatedChildren = updateNode(node.children);
            /* If unchecking, check if any child is still checked */
            let shouldParentBeChecked = node.checked;
            if (!checked) {
              shouldParentBeChecked = updatedChildren.some(
                (child) => child.checked
              );
            }
            return {
              ...node,
              checked: shouldParentBeChecked,
              children: updatedChildren,
            };
          }
          /* Base condition */
          return node;
        });
      };

      /* Set the tree data based on the temporary variable */
      setTreeData((prev) => updateNode(prev));
    },
    []
  );

  /* Function to get checked nodes from treeData, returns the result as an array of SelectedLocations */
  const getCheckedNodes = (nodes: TreeNode[]): SelectedLocations[] => {
    const result: SelectedLocations[] = [];

    const traverseNodes = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.checked) {
          result.push({ id: node.id, label: node.label });
        }
        if (node.children) {
          traverseNodes(node.children);
        }
      }
    };

    traverseNodes(nodes);

    return result;
  };

  const checkedNodes = useMemo(() => {
    return getCheckedNodes(treeData);
  }, [treeData]);

  /* Only save when user has interacted, not on initial sync */
  useEffect(() => {
    if (initLocationRender && hasUserInteracted.current) {
      handleSave(checkedNodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(checkedNodes), initLocationRender]);

  /* Function to update treeData checked values, based on checkedNodes input */
  const updateTreeWithChecked = (
    nodes: TreeNode[],
    checkedNodes: SelectedLocations[]
  ): TreeNode[] => {
    /* Function to check whether a node id exists in checkedNodes */
    const isNodeChecked = (id: string): boolean => {
      return checkedNodes.some((item) => item.id === id);
    };

    /* Function to update checked nodes - only apply explicit checks, don't propagate from parents */
    const updateChecked = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node) => {
        return {
          ...node,
          checked: isNodeChecked(node.id),
          children: node.children ? updateChecked(node.children) : undefined,
        };
      });
    };

    return updateChecked(nodes);
  };

  /* Function to get expanded ids of treeData based on checkedNotes input */
  const getExpandIds = (
    nodes: TreeNode[],
    checkedNodes: SelectedLocations[]
  ): string[] => {
    const expandIds: Set<string> = new Set();

    const findCheckedPaths = (node: TreeNode, parentPath: string[] = []) => {
      if (checkedNodes.some((item) => item.id === node.id)) {
        parentPath.forEach((id) => expandIds.add(id));
      }

      if (node.children) {
        node.children.forEach((child) =>
          findCheckedPaths(child, [...parentPath, node.id])
        );
      }
    };

    nodes.forEach((node) => findCheckedPaths(node));

    /* Return as an array of string */
    return Array.from(expandIds);
  };

  /* Set treeData and expandedIds every initialLocaitons (passed from props) changes */
  useEffect(() => {
    setTreeData((prev) => updateTreeWithChecked(prev, initialLocations));

    if (!initLocationRender)
      setExpanded(getExpandIds(treeData, initialLocations));
    setInitLocationRender(true);
  }, [JSON.stringify(initialLocations)]);

  useEffect(() => {
    const searchInput = containerRef.current?.querySelector('input');
    console.log(searchInput);
    searchInput?.focus();
  }, []);

  const onSave = () => {
    // handleSave(getCheckedNodes(treeData));
    onClose();
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => {
    onClose();
  });

  return {
    treeData,
    //TODO: remove this since it's not used anywhere
    // findNodeById,
    expanded,
    handleToggle,
    onSave,
    handleCheckboxChange,
    handleDescendantsCheckboxChange,
    containerRef,
  };
};
