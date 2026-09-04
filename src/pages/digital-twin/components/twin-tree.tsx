import { Search } from '@digital-twin/components';
import {
  ChevronDownFill,
  ChevronRightFill,
  Cube,
  Cubes,
  Layers,
  Location,
  Tag,
} from '@digital-twin/icons';
import { TreeItem, TreeView } from '@mui/x-tree-view';
import { useEffect, useMemo, useState } from 'react';

import styles from '../digital-twin.module.scss';
import { TwinNode } from '../digital-twin.types';

type TwinTreeProps = {
  tree: TwinNode[];
  activeId: string;
  path: TwinNode[];
  isLoading?: boolean;
  isError?: boolean;
  onSelect: (id: string) => void;
};

const iconFor = (node: TwinNode) => {
  if (node.kind === 'location')
    return node.props.dt_location_type === 'location' ? <Location /> : <Cubes />;
  if (node.kind === 'equipment') return <Cube />;
  if (node.kind === 'group') return <Layers />;
  return node.props.dt_tag ? <Tag /> : null;
};

const matches = (node: TwinNode, q: string): boolean =>
  node.name.toLowerCase().includes(q) ||
  String(node.props.dt_tag ?? '')
    .toLowerCase()
    .includes(q) ||
  node.children.some((c) => matches(c, q));

export const TwinTree = ({ tree, activeId, path, isLoading, isError, onSelect }: TwinTreeProps) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // keep the branch of the active node open
  useEffect(() => {
    setExpanded((prev) => Array.from(new Set([...prev, ...path.slice(0, -1).map((n) => n.id)])));
  }, [path]);

  const searchExpanded = useMemo(() => {
    if (!q) return null;
    const ids: string[] = [];
    const walk = (nodes: TwinNode[]) =>
      nodes.forEach((n) => {
        if (n.children.length && matches(n, q)) {
          ids.push(n.id);
          walk(n.children);
        }
      });
    walk(tree);
    return ids;
  }, [tree, q]);

  const render = (nodes: TwinNode[]) =>
    nodes
      .filter((n) => !q || matches(n, q))
      .map((n) => (
        <TreeItem
          key={n.id}
          nodeId={n.id}
          label={
            <span className={styles['twin-tree__label']}>
              <span className={styles['twin-tree__icon']}>{iconFor(n)}</span>
              <span className={styles['twin-tree__name']} title={n.name}>
                {n.name}
              </span>
              {n.props.dt_tag && n.kind !== 'equipment' ? (
                <span className={styles['twin-tree__tag']}>{String(n.props.dt_tag)}</span>
              ) : null}
            </span>
          }
        >
          {n.children.length ? render(n.children) : null}
        </TreeItem>
      ));

  return (
    <div className={styles['twin-tree']}>
      <div className={styles['panel__title']}>Locations &amp; assets</div>
      <Search
        placeholder="Search name or tag"
        value={query}
        onChange={setQuery}
        timeoutMs={200}
        background="dark"
        wrapperClassName={styles['twin-tree__search']}
      />
      {isLoading ? <div className={styles['twin-tree__status']}>Loading locations…</div> : null}
      {isError ? (
        <div className={styles['twin-tree__status']}>
          Locations unavailable: showing unassigned 3D scenes only
        </div>
      ) : null}
      <div className={styles['twin-tree__scroll']}>
        <TreeView
          expanded={searchExpanded ?? expanded}
          selected={activeId}
          onNodeToggle={(_, ids) => !q && setExpanded(ids)}
          onNodeSelect={(_, id) => typeof id === 'string' && onSelect(id)}
          defaultCollapseIcon={<ChevronDownFill />}
          defaultExpandIcon={<ChevronRightFill />}
        >
          {render(tree)}
        </TreeView>
      </div>
    </div>
  );
};
