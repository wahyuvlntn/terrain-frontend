/* eslint-disable simple-import-sort/imports */
import { Button, Container, Input, Loading } from '@digital-twin/components';
import { SaveFill, Sitemap } from '@digital-twin/icons';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  BaseEdge,
  Connection,
  Edge,
  EdgeChange,
  EdgeProps,
  getBezierPath,
  Handle,
  Node,
  NodeChange,
  Position,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import clsx from 'clsx';
import { useCallback, useContext, useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { ArrowCompound } from '../icons';
import { MappingCtx } from '../issue-mapping';
import { alarmType } from '../schemas';
// default xyflow styling
import '@xyflow/react/dist/style.css';
import { useGetMappingNodeEdge, useIssueMappingParams, useSaveRelationMapping } from '../hooks';
import { GetLayoutedElementsWithElk } from './elk-layout';
import styles from './mapping-v2.module.scss';
import { WrapperNode } from './node';
import { useSearchParams } from 'react-router-dom';

type AlarmNodeProps = {
  data: alarmType;
  type: string;
  selected: boolean;
};
const Alarm = ({ data, type, selected }: AlarmNodeProps) => {
  return (
    <div
      className={clsx(styles['node'], selected && styles['node__selected'])}
      style={!selected ? { cursor: 'pointer' } : {}}
    >
      {type === 'target' && (
        <Handle position={Position.Left} type="target" className={styles['handle-input']} />
      )}
      <span className={styles['warning']}>!</span>
      <span>{data.code}</span>
      <span>-</span>
      <span>{data.name}</span>
      {type === 'source' && (
        <Handle position={Position.Right} type="source" className={styles['handle-output']} />
      )}
    </div>
  );
};

type ParameterNodeProps = {
  data: {
    name: string;
  };
  type: string;
  selected: boolean;
};
const Parameter = ({ data, selected }: ParameterNodeProps) => {
  return (
    <div
      className={clsx(styles['node'], selected && styles['node__selected'])}
      style={!selected ? { cursor: 'pointer' } : {}}
    >
      <Handle position={Position.Left} type="target" className={styles['handle-input']} />
      <span>{data.name}</span>
      <Handle position={Position.Right} type="source" className={styles['handle-output']} />
    </div>
  );
};

const Compound = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={clsx(
        styles['node'],
        styles['node__compound'],
        selected && styles['node__selected']
      )}
      style={!selected ? { cursor: 'pointer' } : {}}
    >
      <Handle position={Position.Left} type="target" className={styles['handle-input']} />
      <span>Compound</span>
      <Handle position={Position.Right} type="source" className={styles['handle-output']} />
    </div>
  );
};

const EdgeMapping = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition,
    targetPosition: targetPosition,
  });
  return (
    <>
      <svg style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <marker
            id="markerEnd"
            markerWidth="30"
            markerHeight="30"
            viewBox="-10 -10 20 20"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
            refX="0"
            refY="0"
            fill="transparent"
          >
            <polyline
              style={{
                strokeWidth: 2,
                stroke: 'white',
              }}
              strokeLinecap="round"
              strokeLinejoin="round"
              points="-8,-6 0,0 -8, 6"
            />
          </marker>
        </defs>
      </svg>
      <BaseEdge
        path={edgePath}
        markerEnd={'url(#markerEnd)'}
        style={{
          strokeWidth: '3px',
          stroke: 'white',
          opacity: selected ? 0.5 : 1,
        }}
      />
    </>
  );
};

const CompoundEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition,
    targetPosition: targetPosition,
  });
  return (
    <BaseEdge
      path={edgePath}
      style={{
        strokeWidth: '3px',
        stroke: 'white',
        opacity: selected ? 0.5 : 1,
      }}
    />
  );
};

export const MappingV2 = () => {
  const mappingCtx = useContext(MappingCtx);
  const { selectedRelation } = useIssueMappingParams();
  const { data: defaultMapping, isLoading } = useGetMappingNodeEdge(selectedRelation);

  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes] = useState<
    {
      position: {
        x: number;
        y: number;
      };
      type?: string;
      data: Record<string, unknown>;
      id: string;
      draggable?: boolean;
      measured?: {
        width?: number;
        height?: number;
      };
    }[]
  >(defaultMapping?.nodes || []);
  const [edges, setEdges] = useState<
    {
      type?: string;
      id: string;
      source: string;
      target: string;
    }[]
  >(defaultMapping?.edges || []);
  const [formatted, setFormatted] = useState(false);
  const reset = useCallback(() => {
    if (defaultMapping) {
      setNodes(defaultMapping.nodes);
      setEdges(defaultMapping.edges);
    }
  }, [defaultMapping]);
  useEffect(() => {
    reset();
    setFormatted(false);
  }, [defaultMapping]);

  // format view
  useEffect(() => {
    const updateLayout = async () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await GetLayoutedElementsWithElk(
        nodes,
        edges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      window.requestAnimationFrame(() => {
        reactFlowInstance.fitView({
          maxZoom: 1,
        });
        reactFlowInstance.zoomTo(1);
      });
    };
    // Only update if nodes have measurements
    if (nodes.length > 0 && nodes.every((n) => n.measured) && !formatted) {
      updateLayout();
      setFormatted(true);
    }
  }, [JSON.stringify(nodes.map((n) => n.measured))]);

  const [clientPosition, setClientPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [alarmData, setAlarmData] = useState({});
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const [scale, setScale] = useState(1);
  const addAlarm = useCallback(
    (type: string) => {
      // console.log('addalarm', type, clientPosition);
      if (clientPosition) {
        const position = reactFlowInstance.screenToFlowPosition(clientPosition);
        const newNode = {
          id: v4(),
          type: type,
          position,
          data: alarmData,
        };
        reactFlowInstance.setNodes((nds) => nds.concat(newNode));
      }
      setClientPosition(null);
    },
    [clientPosition]
  );
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // get data from drag event
      const types = event.dataTransfer.types;
      if (types.includes('alarm')) {
        const nodes = event.dataTransfer.getData('alarm');
        const nodesData = JSON.parse(nodes);
        setAlarmData(nodesData);
        setClientPosition({
          x: event.clientX,
          y: event.clientY,
        });
      } else if (types.includes('parameter')) {
        const nodes = event.dataTransfer.getData('parameter');
        const nodesData = JSON.parse(nodes);
        const newNode = {
          id: v4(),
          type: 'parameter',
          position,
          data: nodesData,
        };
        reactFlowInstance.setNodes((nds) => nds.concat(newNode));
      } else if (types.includes('compound')) {
        const newNode = {
          id: v4(),
          type: 'compound',
          position,
          data: {},
        };
        reactFlowInstance.setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => {
      const target = reactFlowInstance.getNode(params.target);
      if (target) {
        if (target.type !== 'compound') {
          setEdges((edgesSnapshot) => addEdge({ ...params, type: 'mapping' }, edgesSnapshot));
        } else {
          setEdges((edgesSnapshot) => addEdge({ ...params, type: 'compound' }, edgesSnapshot));
        }
      } else {
        setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
      }
    },
    [reactFlowInstance]
  );
  const handleValidation = useCallback(
    (params: Edge | Connection) => {
      const target = reactFlowInstance.getNode(params.target);
      if (target?.type !== 'compound') {
        // only valid if there is no binding
        const binding = reactFlowInstance.getEdges();
        if (
          binding.some((bind) => {
            return bind.target === params.target;
          })
        ) {
          return false;
        }
        return true;
      }
      return true;
    },
    [reactFlowInstance]
  );

  const { onSubmit: saveMapping } = useSaveRelationMapping();

  const [searchParams] = useSearchParams();

  const relation = searchParams.get('relation');

  const [relationName, setRelationName] = useState('');

  useEffect(() => {
    setRelationName(mappingCtx?.relation || '');
  }, [mappingCtx?.relation]);

  return (
    <Container
      title="Issue Mapping"
      icon={<Sitemap />}
      background="none"
      className={styles['issue']}
      rightTopComponent={
        relation && (
          <div className={styles['right-top']}>
            <Button color="default-secondary" type="button" onClick={reset}>
              Reset
            </Button>
            <Button
              icon={<SaveFill />}
              onClick={() => {
                if (selectedRelation && mappingCtx) {
                  saveMapping({
                    id: selectedRelation,
                    relation: relationName,
                    data: {
                      nodes: nodes,
                      edges: edges,
                    },
                  });
                }
              }}
            >
              Save
            </Button>
          </div>
        )
      }
    >
      <Loading isLoading={isLoading} />
      {relation && (
        <div className={styles['canvas']}>
          <div className={styles['header']}>
            <Input
              value={relationName}
              onChange={(e) => setRelationName(e.target.value)}
              wrapperProps={{ style: { width: 300, fontSize: 16 } }}
            />
            <div className={styles['zoom']}>
              <div
                className={styles['button']}
                style={{ cursor: scale > 0.25 ? 'pointer' : 'auto' }}
                onClick={() => {
                  if (scale > 0.25) reactFlowInstance.zoomTo(scale - 0.1);
                }}
              >
                -
              </div>
              <div className={styles['value']}>
                {Math.round(scale * 100)
                  .toString()
                  .replace(/[.,]00$/, '')}
                %
              </div>
              <div
                className={styles['button']}
                style={{ cursor: scale < 2.5 ? 'pointer' : 'auto' }}
                onClick={() => {
                  if (scale < 2.5) reactFlowInstance.zoomTo(scale + 0.1);
                }}
              >
                +
              </div>
            </div>
          </div>
          <div className={styles['compound']}>
            <div>
              <ArrowCompound />
            </div>
            <WrapperNode type="compound" data="">
              <div className={styles['compound-node']}>Compound</div>
            </WrapperNode>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            deleteKeyCode={['Backspace', 'Delete']}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isValidConnection={handleValidation}
            proOptions={{ hideAttribution: true }}
            nodeTypes={{
              source: Alarm,
              target: Alarm,
              parameter: Parameter,
              compound: Compound,
            }}
            edgeTypes={{ mapping: EdgeMapping, compound: CompoundEdge }}
            onViewportChange={(viewport) => setScale(viewport.zoom)}
            minZoom={0.2}
            maxZoom={2.5}
            zoomOnDoubleClick={false}
            fitViewOptions={{
              padding: {
                top: '240px',
                left: '32px',
                right: '32px',
                bottom: '32px',
              },
            }}
          />
          {clientPosition && (
            <div
              style={{
                position: 'fixed',
                zIndex: 100,
                top: clientPosition.y,
                left: clientPosition.x,
              }}
              className={styles['tooltip']}
            >
              <div>Alarm Type</div>
              <div className={styles['options']}>
                <div onClick={() => addAlarm('source')} className={styles['button']}>
                  Source
                </div>
                <div onClick={() => addAlarm('target')} className={styles['button']}>
                  Target
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Container>
  );
};
