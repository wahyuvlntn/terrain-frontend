import { Edge, Node } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'mrtree',
  'elk.direction': 'RIGHT', // atau DOWN
  'elk.spacing.nodeNode': '60',
  'elk.spacing.edgeNode': '20',

  // Tree specific
  'elk.mrtree.compaction': 'true',
  'elk.mrtree.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

const getNodeType = (nodeId: string) => {
  if (nodeId.startsWith('source-')) return 'source';
  if (nodeId.startsWith('target-')) return 'target';
  return 'component';
};

const createPortId = (
  nodeId: string,
  type: 'input' | 'output',
  property: string
) => {
  return `${nodeId}_${type}_${property.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

// const extractHandlesFromNode = (node: Node) => {
//   const handles = {
//     inputs: [] as string[],
//     outputs: [] as string[],
//   };

//   if (!node.data?.properties) {
//     return handles;
//   }

//   const properties = node.data.properties as propertyList;

//   // Extract input handles
//   const inputArrays = [
//     properties.configuration || [],
//     properties.parameter || [],
//     properties.event || [],
//     properties.style || [],
//   ];

//   inputArrays.forEach((array) => {
//     array.forEach((prop: any) => {
//       if (prop?.isInput && prop?.addressProperty) {
//         handles.inputs.push(prop.addressProperty);
//       }
//     });
//   });

//   // Extract output handles
//   const outputArrays = [properties.output || [], properties.error || [], properties.event || []];

//   outputArrays.forEach((array) => {
//     array.forEach((prop: any) => {
//       if (prop?.isOutput && prop?.addressProperty) {
//         handles.outputs.push(prop.addressProperty);
//       }
//     });
//   });

//   return handles;
// };

const resolveHandleToPortId = (
  handle: string | null | undefined,
  nodeId: string,
  node: Node | undefined,
  nodeHandles: Map<string, { inputs: string[]; outputs: string[] }>,
  isSource: boolean
): string => {
  const actualNodeId = nodeId;

  if (!handle || !node) {
    return isSource
      ? `${actualNodeId}_default_out`
      : `${actualNodeId}_default_in`;
  }

  const handles = nodeHandles.get(nodeId);
  if (!handles) {
    return isSource
      ? `${actualNodeId}_default_out`
      : `${actualNodeId}_default_in`;
  }

  const handleParts = handle.split('.');
  if (handleParts.length >= 3) {
    const property = handleParts.slice(2).join('.');
    const targetHandles = isSource ? handles.outputs : handles.inputs;

    if (targetHandles.includes(property)) {
      const type = isSource ? 'output' : 'input';
      return createPortId(actualNodeId, type, property);
    }
  }

  const availableHandles = isSource ? handles.outputs : handles.inputs;
  if (availableHandles.length > 0) {
    const type = isSource ? 'output' : 'input';
    return createPortId(actualNodeId, type, availableHandles[0]);
  }

  return isSource
    ? `${actualNodeId}_default_out`
    : `${actualNodeId}_default_in`;
};

export const createValidElkGraph = (nodes: Node[], edges: Edge[]) => {
  const nodeHandles = new Map<
    string,
    { inputs: string[]; outputs: string[] }
  >();
  const nodeMap = new Map<string, Node>();

  nodes.forEach((node) => {
    // const handles = extractHandlesFromNode(node);
    if (node.type === 'source') {
      nodeHandles.set(node.id, {
        inputs: [],
        outputs: [node.id],
      });
    } else if (node.type === 'compound' || node.type === 'parameter') {
      nodeHandles.set(node.id, {
        inputs: [node.id],
        outputs: [node.id],
      });
    } else if (node.type === 'target') {
      nodeHandles.set(node.id, {
        inputs: [],
        outputs: [node.id],
      });
    } else {
      nodeHandles.set(node.id, {
        inputs: [],
        outputs: [],
      });
    }
    nodeMap.set(node.id, node);
  });

  const elkNodes = nodes.map((node) => {
    const handles = nodeHandles.get(node.id) || { inputs: [], outputs: [] };
    const actualNodeId = node.id;
    const nodeType = getNodeType(node.id);
    const ports: { id: string; properties: { [key: string]: string } }[] = [];

    // Create input ports
    handles.inputs.forEach((handle) => {
      ports.push({
        id: createPortId(actualNodeId, 'input', handle),
        properties: { 'elk.port.side': 'WEST' },
      });
    });

    // Create output ports
    handles.outputs.forEach((handle) => {
      ports.push({
        id: createPortId(actualNodeId, 'output', handle),
        properties: { 'elk.port.side': 'EAST' },
      });
    });

    // Always add default ports
    ports.push(
      {
        id: `${actualNodeId}_default_in`,
        properties: { 'elk.port.side': 'WEST' },
      },
      {
        id: `${actualNodeId}_default_out`,
        properties: { 'elk.port.side': 'EAST' },
      }
    );

    const nodeProperties: Record<string, string> = {};

    if (nodeType === 'source') {
      nodeProperties['elk.layered.layerConstraint'] = 'FIRST_TARGET';
    } else if (nodeType === 'target') {
      nodeProperties['elk.layered.layerConstraint'] = 'LAST_TARGET';
    }

    return {
      id: node.id,
      width: node.measured?.width || node.width || 200,
      height: node.measured?.height || node.height || 150,
      ports,
      properties: nodeProperties,
    };
  });

  const validEdges = edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    const sourcePort = resolveHandleToPortId(
      edge.sourceHandle,
      edge.source,
      sourceNode,
      nodeHandles,
      true
    );

    const targetPort = resolveHandleToPortId(
      edge.targetHandle,
      edge.target,
      targetNode,
      nodeHandles,
      false
    );

    return {
      id: edge.id,
      sources: [sourcePort],
      targets: [targetPort],
    };
  });

  return {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: validEdges,
  };
};

export const GetLayoutedElementsWithElk = async (
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  try {
    const elkGraph = createValidElkGraph(nodes, edges);
    const layoutedGraph = await elk.layout(elkGraph);

    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      const x = elkNode?.x || 0;
      const y = elkNode?.y || 0;

      return {
        ...node,
        style: { opacity: 1 },
        draggable: true,
        deletable: true,
        position: { x, y },
      };
    });

    return {
      nodes: layoutedNodes,
      edges: edges.map((edge) => ({ ...edge, style: { opacity: 1 } })),
    };
  } catch (error) {
    console.error('ELK layout failed:', error);

    const fallbackNodes = nodes.map((node, index) => {
      const type = getNodeType(node.id);
      const typeOrder = { source: 0, component: 1, target: 2 };
      const column = typeOrder[type];
      const rowsInColumn = nodes.filter(
        (n) => getNodeType(n.id) === type
      ).length;
      const rowIndex = nodes.filter(
        (n, i) => i < index && getNodeType(n.id) === type
      ).length;

      return {
        ...node,
        draggable: true,
        deletable: true,
        style: { opacity: 1 },
        position: {
          x: column * 400,
          y: rowIndex * 200 + (400 - (rowsInColumn * 200) / 2),
        },
      };
    });

    return {
      nodes: fallbackNodes,
      edges: edges.map((edge) => ({ ...edge, style: { opacity: 1 } })),
    };
  }
};
