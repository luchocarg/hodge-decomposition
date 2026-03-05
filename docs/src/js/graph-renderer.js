export class GraphRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);

        this.data = {
            nodes: this.nodes,
            edges: this.edges
        };

        this.options = {
            nodes: {
                shape: 'dot',
                size: 26,
                color: {
                    background: '#1e293b',
                    border: '#3b82f6',
                    highlight: {
                        background: '#3b82f6',
                        border: '#60a5fa'
                    }
                },
                font: { color: '#f8fafc', size: 15, face: 'Inter' },
                borderWidth: 2
            },
            edges: {
                width: 2.5,
                color: {
                    color: '#64748b',
                    highlight: '#94a3b8'
                },
                arrows: {
                    to: { enabled: true, scaleFactor: 0.75, type: 'arrow' }
                },
                font: {
                    color: '#f8fafc',
                    size: 14,
                    align: 'middle',
                    background: 'rgba(15, 23, 42, 0.85)',
                    strokeWidth: 0, // removed stroke to make text cleaner in dark mode
                    face: 'Inter'
                },
                smooth: {
                    enabled: true,
                    type: 'dynamic',
                    roundness: 0.5
                }
            },
            physics: {
                barnesHut: {
                    gravitationalConstant: -4000,
                    centralGravity: 0.3,
                    springLength: 220,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.15
                },
                maxVelocity: 50,
                solver: 'barnesHut',
                timestep: 0.5,
                stabilization: { iterations: 150 }
            },
            interaction: {
                hover: true,
                multiselect: true,
                navigationButtons: false
            },
            manipulation: {
                enabled: false,
                addEdge: (edgeData, callback) => {
                    if (edgeData.from !== edgeData.to) {
                        const existing = this.edges.get().find(e => e.from === edgeData.from && e.to === edgeData.to);
                        if (!existing) {
                            edgeData.id = this.edgeCounter++;
                            edgeData.label = '0.0';
                            edgeData.flow = 0.0;
                            // Add an arrow automatically by default settings
                            callback(edgeData);
                            return;
                        }
                    }
                    callback(null); // Cancel edge addition
                }
            }
        };

        this.network = new vis.Network(this.container, this.data, this.options);

        this.nodeCounter = 1;
        this.edgeCounter = 1;

        // Initialize with a simple graph
        this._initSampleGraph();
    }

    _initSampleGraph() {
        this.nodes.add([
            { id: 1, label: 'Node 1' },
            { id: 2, label: 'Node 2' },
            { id: 3, label: 'Node 3' }
        ]);

        this.edges.add([
            { id: 1, from: 1, to: 2, label: '0.0', flow: 0.0 },
            { id: 2, from: 2, to: 3, label: '0.0', flow: 0.0 },
            { id: 3, from: 3, to: 1, label: '0.0', flow: 0.0 }
        ]);

        this.nodeCounter = 4;
        this.edgeCounter = 4;
    }

    addNode() {
        const id = this.nodeCounter++;
        this.nodes.add({ id, label: `Node ${id}` });
        return id;
    }

    addEdge(fromId, toId) {
        if (!fromId || !toId || fromId === toId) return;

        // Prevent duplicate edges
        const existing = this.edges.get().find(e => e.from === fromId && e.to === toId);
        if (existing) return;

        const id = this.edgeCounter++;
        this.edges.add({
            id,
            from: fromId,
            to: toId,
            label: '0.0',
            flow: 0.0
        });
    }

    startAddEdgeMode() {
        this.network.addEdgeMode();
    }

    deleteSelected() {
        const selection = this.network.getSelection();
        if (selection.nodes.length > 0) {
            this.nodes.remove(selection.nodes);
        }
        if (selection.edges.length > 0) {
            this.edges.remove(selection.edges);
        }
    }

    generateRandomGraph(numNodes = 10, numEdges = 16) {
        this.nodes.clear();
        this.edges.clear();

        const newNodes = [];
        for (let i = 1; i <= numNodes; i++) {
            newNodes.push({ id: i, label: `Node ${i}` });
        }
        this.nodes.add(newNodes);

        const newEdges = [];
        let edgeId = 1;

        while (newEdges.length < numEdges) {
            const from = Math.floor(Math.random() * numNodes) + 1;
            const to = Math.floor(Math.random() * numNodes) + 1;

            if (from !== to) {
                // Prevent duplicate edges
                const existing = newEdges.find(e => e.from === from && e.to === to);
                if (!existing) {
                    const randomFlow = (Math.random() * 10 - 5).toFixed(1);
                    newEdges.push({
                        id: edgeId++,
                        from: from,
                        to: to,
                        label: String(randomFlow),
                        flow: parseFloat(randomFlow)
                    });
                }
            }
        }
        this.edges.add(newEdges);

        this.nodeCounter = numNodes + 1;
        this.edgeCounter = edgeId;
    }

    setFlowOnSelectedEdges(flowValue) {
        const selection = this.network.getSelection();
        if (selection.edges.length > 0) {
            const updates = selection.edges.map(id => ({
                id,
                label: flowValue.toFixed(1),
                flow: flowValue
            }));
            this.edges.update(updates);
        }
    }

    getDto() {
        const _nodes = this.nodes.get().map(n => n.id);
        const _edges = this.edges.get().map(e => ({
            incomingEdgeId: e.id,
            incomingEdgeFrom: e.from,
            incomingEdgeTo: e.to,
            incomingEdgeFlow: e.flow
        }));

        return {
            incomingGraphNodes: _nodes,
            incomingGraphEdges: _edges
        };
    }

    applyDecomposition(resultDto) {
        if (!resultDto || !resultDto.outgoingSimulationResultEdges) return;

        const edgeUpdates = [];

        // Map DTO edges back to graph rendering updates
        resultDto.outgoingSimulationResultEdges.forEach(dtoEdge => {
            const edge = this.edges.get(dtoEdge.outgoingEdgeResultId);
            if (edge) {
                const gradFlow = dtoEdge.outgoingEdgeResultGradient;
                const rotFlow = dtoEdge.outgoingEdgeResultRotational;

                // Determine dominant flow type for color coding
                let color = { color: '#475569', highlight: '#94a3b8' }; // Default
                let flowType = "Zero";

                const absGrad = Math.abs(gradFlow);
                const absRot = Math.abs(rotFlow);

                if (absGrad > 0.01 && absRot > 0.01) {
                    color = { color: '#8b5cf6', highlight: '#a78bfa' }; // Harmonic
                    flowType = "Harmonic";
                } else if (absGrad > 0.01) {
                    color = { color: '#ec4899', highlight: '#f472b6' }; // Gradient/Curl-free
                    flowType = "Gradient";
                } else if (absRot > 0.01) {
                    color = { color: '#06b6d4', highlight: '#22d3ee' }; // Rotational/Div-free
                    flowType = "Rotational";
                }

                // Format label with all components
                const label = `Original: ${edge.flow.toFixed(1)}\n∇: ${gradFlow.toFixed(2)}\n∇x: ${rotFlow.toFixed(2)}`;

                edgeUpdates.push({
                    id: edge.id,
                    color: color,
                    label: label,
                    title: `Flow Type: ${flowType}\nGradient Component: ${gradFlow.toFixed(3)}\nRotational Component: ${rotFlow.toFixed(3)}`
                });
            }
        });

        this.edges.update(edgeUpdates);

        // Map Node potentials/divergence to colors/titles
        if (resultDto.outgoingSimulationResultNodes) {
            const nodeUpdates = [];
            resultDto.outgoingSimulationResultNodes.forEach(dtoNode => {
                const node = this.nodes.get(dtoNode.outgoingNodeResultId);
                if (node) {
                    nodeUpdates.push({
                        id: node.id,
                        title: `Potential: ${dtoNode.outgoingNodeResultPotential.toFixed(3)}\nDivergence: ${dtoNode.outgoingNodeResultDivergence.toFixed(3)}`
                    });
                }
            });
            this.nodes.update(nodeUpdates);
        }
    }
}
