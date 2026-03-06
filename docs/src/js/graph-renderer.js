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
                shape: 'circle',
                widthConstraint: { minimum: 45, maximum: 45 },
                color: {
                    background: '#1e293b',
                    border: '#3b82f6',
                    highlight: {
                        background: '#3b82f6',
                        border: '#60a5fa'
                    }
                },
                font: { color: '#f8fafc', size: 16, face: 'Inter', align: 'center' },
                borderWidth: 2
            },
            edges: {
                width: 2.5,
                color: { // Vis.js native lines are fully transparent using opacity, so our ctx gradients show underneath without crashing the color parser
                    color: '#000000',
                    highlight: '#000000',
                    hover: '#000000',
                    opacity: 0.0
                },
                arrows: {
                    to: { enabled: false }
                },
                font: {
                    color: '#f8fafc',
                    size: 14,
                    align: 'middle',
                    background: 'rgba(15, 23, 42, 0.85)',
                    strokeWidth: 0,
                    face: 'Inter'
                },
                // Turn off labels by default, show on hover/select via title
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
                navigationButtons: false,
                tooltipDelay: 100
            },
            manipulation: {
                enabled: false,
                addEdge: (edgeData, callback) => {
                    if (edgeData.from !== edgeData.to) {
                        const existing = this.edges.get().find(e => e.from === edgeData.from && e.to === edgeData.to);
                        if (!existing) {
                            edgeData.id = this.edgeCounter++;
                            edgeData.label = undefined; // No label initially
                            edgeData.title = 'Flow J: 0.0';
                            edgeData.flow = 0.0;
                            callback(edgeData);
                            return;
                        }
                    }
                    callback(null); // Cancel edge addition
                }
            }
        };

        this.network = new vis.Network(this.container, this.data, this.options);

        // Custom edge rendering for gradient direction
        this.network.on("beforeDrawing", (ctx) => {
            const edgeIds = this.network.body.edges;
            const nodes = this.network.body.nodes;

            Object.keys(edgeIds).forEach(edgeId => {
                const edgeObj = edgeIds[edgeId];
                if (!edgeObj.options) return;

                const fromNode = nodes[edgeObj.fromId];
                const toNode = nodes[edgeObj.toId];
                if (!fromNode || !toNode) return;

                const fromPos = this.network.getPositions([edgeObj.fromId])[edgeObj.fromId];
                const toPos = this.network.getPositions([edgeObj.toId])[edgeObj.toId];
                if (!fromPos || !toPos) return;

                let renderFlow = 0;
                let colorBase = '#64748b'; // default gray
                let isReversed = false;
                let isMuted = false;

                if (this.activeFilter) {
                    const visuals = this.baseEdgeData.get(parseInt(edgeId));
                    if (visuals && visuals._decomp) {
                        if (this.activeFilter === 'gradient') {
                            renderFlow = visuals._decomp.gradFlow;
                            colorBase = '#ec4899';
                        } else if (this.activeFilter === 'rotational') {
                            renderFlow = visuals._decomp.rotFlow;
                            colorBase = '#06b6d4';
                        } else if (this.activeFilter === 'harmonic') {
                            renderFlow = visuals._decomp.harmFlow;
                            colorBase = '#8b5cf6';
                        }
                    }
                    if (Math.abs(renderFlow) < 0.001) isMuted = true;
                } else {
                    const rawEdge = this.edges.get(edgeId);
                    if (rawEdge) renderFlow = rawEdge.flow;
                }

                isReversed = renderFlow < 0;

                // Create gradient bounding box taking curve into account
                let startX = fromPos.x, startY = fromPos.y;
                let endX = toPos.x, endY = toPos.y;

                let via = null;
                if (edgeObj.edgeType && typeof edgeObj.edgeType.getViaNode === 'function') {
                    via = edgeObj.edgeType.getViaNode();
                    if (via) {
                        endX = toPos.x; endY = toPos.y;
                    }
                }

                const gradient = ctx.createLinearGradient(startX, startY, endX, endY);

                // Parse base color
                let r = 100, g = 116, b = 139;
                if (colorBase.startsWith('#')) {
                    const hex = colorBase.replace('#', '');
                    r = parseInt(hex.substring(0, 2), 16) || r;
                    g = parseInt(hex.substring(2, 4), 16) || g;
                    b = parseInt(hex.substring(4, 6), 16) || b;
                }

                // If alpha toggled (inactive filter), keep it entirely muted
                let baseAlpha = isMuted ? 0.05 : 0.25;
                let brightAlpha = isMuted ? 0.15 : 1.0;

                // Base color (origin) -> Bright color (destination)
                const opaqueColor = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
                const solidColor = `rgba(${r}, ${g}, ${b}, ${brightAlpha})`;

                if (isReversed) {
                    gradient.addColorStop(0, solidColor);
                    gradient.addColorStop(1, opaqueColor);
                } else {
                    gradient.addColorStop(0, opaqueColor);
                    gradient.addColorStop(1, solidColor);
                }

                ctx.save();
                ctx.strokeStyle = gradient;

                // Keep the exact thickness of the underlying vis.js edge option
                ctx.lineWidth = edgeObj.options.width || 2.5;

                // Draw curve identically to how vis.js calculates bezier shapes
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);

                if (via) {
                    ctx.quadraticCurveTo(via.x, via.y, toPos.x, toPos.y);
                } else {
                    ctx.lineTo(toPos.x, toPos.y);
                }

                ctx.stroke();
                ctx.restore();
            });
        });

        // Track active filters
        this.activeFilter = null; // 'gradient', 'rotational', 'harmonic', or null
        this.baseEdgeData = new Map(); // Store original edge physics after decomposition

        this.nodeCounter = 1;
        this.edgeCounter = 1;

        // Initialize with a simple graph
        this._initSampleGraph();
    }

    _initSampleGraph() {
        this.nodes.add([
            { id: 1, label: '1' },
            { id: 2, label: '2' },
            { id: 3, label: '3' }
        ]);

        this.edges.add([
            { id: 1, from: 1, to: 2, flow: 0.0, title: 'Flow J: 0.0' },
            { id: 2, from: 2, to: 3, flow: 0.0, title: 'Flow J: 0.0' },
            { id: 3, from: 3, to: 1, flow: 0.0, title: 'Flow J: 0.0' }
        ]);

        this.nodeCounter = 4;
        this.edgeCounter = 4;
    }

    addNode() {
        const id = this.nodeCounter++;
        this.nodes.add({ id, label: `${id}` });
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
            flow: 0.0,
            title: 'Flow J: 0.0'
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
            newNodes.push({ id: i, label: `${i}` });
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
                        flow: parseFloat(randomFlow),
                        title: `Flow J: ${randomFlow}`
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
                flow: flowValue,
                title: `Flow J: ${flowValue.toFixed(1)}`
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
        if (!resultDto || !resultDto.outgoingSimulationResultEdges) return null;

        const edgeUpdates = [];
        let totalEnergy = 0;
        let gradEnergy = 0;
        let rotEnergy = 0;
        let harmEnergy = 0;

        // Store decomposition data for layer toggling later
        this.baseEdgeData.clear();

        // Find max flow to normalize thickness
        let maxAbsFlow = 0;
        resultDto.outgoingSimulationResultEdges.forEach(dtoEdge => {
            const edge = this.edges.get(dtoEdge.outgoingEdgeResultId);
            if (edge) {
                if (Math.abs(edge.flow) > maxAbsFlow) maxAbsFlow = Math.abs(edge.flow);
            }
        });
        if (maxAbsFlow === 0) maxAbsFlow = 1; // Prevent div by zero

        // Map DTO edges back to graph rendering updates
        resultDto.outgoingSimulationResultEdges.forEach(dtoEdge => {
            const edge = this.edges.get(dtoEdge.outgoingEdgeResultId);
            if (edge) {
                const J = edge.flow;
                const gradFlow = dtoEdge.outgoingEdgeResultGradient;
                const rotFlow = dtoEdge.outgoingEdgeResultRotational;
                // Harmonic flow mathematically is J - grad - rot
                const harmFlow = J - gradFlow - rotFlow;

                totalEnergy += J * J;
                gradEnergy += gradFlow * gradFlow;
                rotEnergy += rotFlow * rotFlow;
                harmEnergy += harmFlow * harmFlow;

                // Make edge thickness proportional to total flow
                const absJ = Math.abs(J);
                // Clamp thickness between 2 (min) and 12 (max)
                const thickness = Math.max(2, Math.min(12, 1.5 + (absJ / maxAbsFlow) * 8));

                // Build a title (on-hover) with components
                const title = `Jtotal: ${Math.abs(J).toFixed(2)} | ∇ϕ: ${Math.abs(gradFlow).toFixed(2)} | ∇×: ${Math.abs(rotFlow).toFixed(2)} | Harm: ${Math.abs(harmFlow).toFixed(2)}`;

                // Base Colors for Decomposition (Hex constants to match CSS perfectly):
                // Gradient/Irrotational: #ec4899 (Pink/Fuchsia)
                // Rotational/Solenoidal: #06b6d4 (Cyan)
                // Harmonic/Global: #8b5cf6 (Purple)
                let gradientColorBase = '#64748b'; // Default gray 

                if (Math.abs(gradFlow) > 0.01 && Math.abs(rotFlow) > 0.01) {
                    gradientColorBase = '#8b5cf6';
                } else if (Math.abs(gradFlow) > 0.01) {
                    gradientColorBase = '#ec4899';
                } else if (Math.abs(rotFlow) > 0.01) {
                    gradientColorBase = '#06b6d4';
                }

                // Simulate direction using a gradient from dark (transparent) to the base color
                let renderedColor = null;
                // Since visjs doesn't natively support link gradients well in standard color blocks, 
                // we can just use color, and perhaps add a slight opacity to it to simulate direction if wanted.
                // However, to truly use gradient color without arrows, we have to use color.color string
                if (J < 0) {
                    // Reverse flow
                    // Direction visual: We keep standard color here but we will add logic for custom rendering later if needed
                    renderedColor = { color: gradientColorBase, highlight: gradientColorBase };
                } else {
                    renderedColor = { color: gradientColorBase, highlight: gradientColorBase };
                }

                const baseVisuals = {
                    id: edge.id,
                    width: thickness,
                    color: { color: '#000000', highlight: '#000000', hover: '#000000', opacity: 0.0 },
                    arrows: { to: { enabled: false } },
                    title: title,
                    label: undefined, // ensure label is hidden
                    // Custom properties for switching layers
                    _decomp: {
                        gradFlow,
                        rotFlow,
                        harmFlow,
                        maxAbsFlow
                    }
                };

                this.baseEdgeData.set(edge.id, baseVisuals);
                edgeUpdates.push(baseVisuals);
            }
        });

        this.edges.update(edgeUpdates);

        // Apply active filter if one was selected
        if (this.activeFilter) {
            this.applyLayerFilter(this.activeFilter);
        }

        // Map Node potentials/divergence to colors/titles
        if (resultDto.outgoingSimulationResultNodes) {
            const nodeUpdates = [];

            // Find max potential magnitude for scaling
            let maxAbsPotential = 0.001; // Avoid divide by zero
            let maxAbsDivergence = 0.001;

            resultDto.outgoingSimulationResultNodes.forEach(dtoNode => {
                const absPot = Math.abs(dtoNode.outgoingNodeResultPotential);
                const absDiv = Math.abs(dtoNode.outgoingNodeResultDivergence);
                if (absPot > maxAbsPotential) maxAbsPotential = absPot;
                if (absDiv > maxAbsDivergence) maxAbsDivergence = absDiv;
            });

            // CoolWarm Hex Interpolator helper
            // Map t (-1 to 1) to Blue (-1) -> Gray (0) -> Red (1)
            const getDivergenceColor = (divVal) => {
                const t = Math.max(-1, Math.min(1, divVal / maxAbsDivergence)); // Normalized [-1, 1]

                // Base colors: Blue (#3b82f6), Gray (#1e293b), Red (#ef4444)
                let r, g, b;

                if (t === 0) {
                    return { bg: '#1e293b', border: '#475569' };
                } else if (t < 0) {
                    // Interpolate Gray to Blue
                    const p = Math.abs(t);
                    r = Math.round(30 + p * (59 - 30));
                    g = Math.round(41 + p * (130 - 41));
                    b = Math.round(59 + p * (246 - 59));
                } else {
                    // Interpolate Gray to Red
                    const p = t;
                    r = Math.round(30 + p * (239 - 30));
                    g = Math.round(41 + p * (68 - 41));
                    b = Math.round(59 + p * (68 - 59));
                }

                // Darken slightly for borders
                const br = Math.max(0, r - 30);
                const bg = Math.max(0, g - 30);
                const bb = Math.max(0, b - 30);

                return {
                    bg: `rgb(${r}, ${g}, ${b})`,
                    border: `rgb(${br}, ${bg}, ${bb})`
                };
            };

            resultDto.outgoingSimulationResultNodes.forEach(dtoNode => {
                const node = this.nodes.get(dtoNode.outgoingNodeResultId);
                if (node) {
                    const absPot = Math.abs(dtoNode.outgoingNodeResultPotential);
                    // Base width is 45. We scale it up to a maximum of 80 based on potential magnitude.
                    const nodeSize = 45 + (absPot / maxAbsPotential) * 35;
                    const colors = getDivergenceColor(dtoNode.outgoingNodeResultDivergence);

                    nodeUpdates.push({
                        id: node.id,
                        title: `Potential (ϕ): ${dtoNode.outgoingNodeResultPotential.toFixed(3)}\nDivergence (∇·J): ${dtoNode.outgoingNodeResultDivergence.toFixed(3)}`,
                        widthConstraint: { minimum: nodeSize, maximum: nodeSize },
                        color: {
                            background: colors.bg,
                            border: colors.border,
                            highlight: {
                                background: colors.border,
                                border: '#ffffff'
                            }
                        }
                    });
                }
            });
            this.nodes.update(nodeUpdates);
        }

        return {
            totalEnergy,
            gradEnergy,
            rotEnergy,
            harmEnergy
        };
    }

    // New method for toggling visual layers
    applyLayerFilter(filterType) {
        this.activeFilter = filterType;
        if (!this.activeFilter) {
            // Restore base dataset
            const updates = Array.from(this.baseEdgeData.values());
            if (updates.length > 0) this.edges.update(updates);
            return;
        }

        const updates = [];
        this.baseEdgeData.forEach((visuals, edgeId) => {
            const decomp = visuals._decomp;
            let targetFlow = 0;
            let targetColor = '#64748b'; // Gray for inactive

            if (filterType === 'gradient') {
                targetFlow = decomp.gradFlow;
                targetColor = '#ec4899'; // Fuchsia
            } else if (filterType === 'rotational') {
                targetFlow = decomp.rotFlow;
                targetColor = '#06b6d4'; // Cyan
            } else if (filterType === 'harmonic') {
                targetFlow = decomp.harmFlow;
                targetColor = '#8b5cf6'; // Purple
            }

            const absTarget = Math.abs(targetFlow);
            // If the component is negligible, make it thin
            if (absTarget < 0.001) {
                updates.push({
                    id: edgeId,
                    width: visuals.width, // keep original size
                    arrows: { to: { enabled: false } }
                });
            } else {
                // Emphasize this component with thickness based on its magnitude
                const thickness = Math.max(2, Math.min(12, 1.5 + (absTarget / decomp.maxAbsFlow) * 8));
                updates.push({
                    id: edgeId,
                    width: thickness,
                    arrows: { to: { enabled: false } }
                });
            }
        });

        this.edges.update(updates);
    }
}
