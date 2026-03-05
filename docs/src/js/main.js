import { WasmService } from './wasm-service.js';
import { GraphRenderer } from './graph-renderer.js';

document.addEventListener('DOMContentLoaded', async () => {
    const graph = new GraphRenderer('networkGraph');
    window.graphInstance = graph; // Exposed for debugging
    const engine = new WasmService();

    // UI Elements
    const addNodeBtn = document.getElementById('addNodeBtn');
    const addEdgeBtn = document.getElementById('addEdgeBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const randomGraphBtn = document.getElementById('randomGraphBtn');
    const flowInput = document.getElementById('flowInput');
    const setFlowBtn = document.getElementById('setFlowBtn');
    const runDecompBtn = document.getElementById('runDecompBtn');
    const legendSection = document.getElementById('legendSection');

    const wasmStatus = document.getElementById('wasmStatus');
    const wasmStatusText = document.getElementById('wasmStatusText');

    let wasmReady = false;

    // Initialize WASM
    try {
        await engine.init();
        wasmStatus.className = 'status-dot success';
        wasmStatusText.textContent = 'Compute Engine Initialized';
        wasmReady = true;
    } catch (e) {
        wasmStatus.className = 'status-dot error';
        wasmStatusText.textContent = 'Engine Failed to Load';
        console.error(e);
    }

    // Graph interactions
    addNodeBtn.addEventListener('click', () => {
        graph.addNode();
    });

    let edgeMode = false;
    let sourceNodeId = null;

    addEdgeBtn.addEventListener('click', () => {
        edgeMode = !edgeMode;
        if (edgeMode) {
            addEdgeBtn.classList.replace('secondary-btn', 'primary-btn');
            addEdgeBtn.textContent = 'Select Source Node...';
            sourceNodeId = null;
        } else {
            addEdgeBtn.classList.replace('primary-btn', 'secondary-btn');
            addEdgeBtn.textContent = 'Add Edge';
            sourceNodeId = null;
        }
    });

    // Use raw click and explicitly check coordinates to bypass event payload bugs
    graph.network.on('click', (params) => {
        if (!edgeMode) return;

        // Force vis-network to tell us what node is definitively under the mouse right now
        const nodeIdAtPointer = graph.network.getNodeAt(params.pointer.DOM);

        if (nodeIdAtPointer !== undefined && nodeIdAtPointer !== null) {
            if (sourceNodeId === null) {
                // Step 1: Select Source
                sourceNodeId = nodeIdAtPointer;
                addEdgeBtn.textContent = 'Select Target Node...';
                graph.network.selectNodes([sourceNodeId]);
            } else {
                // Step 2: Select Target and create Edge
                if (sourceNodeId !== nodeIdAtPointer) {
                    graph.addEdge(sourceNodeId, nodeIdAtPointer);
                }

                // Reset mode
                edgeMode = false;
                sourceNodeId = null;
                addEdgeBtn.classList.replace('primary-btn', 'secondary-btn');
                addEdgeBtn.textContent = 'Add Edge';

                setTimeout(() => {
                    graph.network.unselectAll();
                }, 150);
            }
        }
    });

    deleteBtn.addEventListener('click', () => {
        graph.deleteSelected();
    });

    randomGraphBtn.addEventListener('click', () => {
        graph.generateRandomGraph();
    });

    setFlowBtn.addEventListener('click', () => {
        const flowValue = parseFloat(flowInput.value);
        if (!isNaN(flowValue)) {
            graph.setFlowOnSelectedEdges(flowValue);
        }
    });

    // Run Engine
    runDecompBtn.addEventListener('click', () => {
        if (!wasmReady) {
            alert("Engine is not ready.");
            return;
        }

        try {
            const dto = graph.getDto();

            runDecompBtn.innerHTML = '<span class="btn-text">Computing...</span><span class="btn-icon">⏳</span>';
            runDecompBtn.style.opacity = '0.7';

            setTimeout(() => {
                try {
                    const resultDto = engine.runDecomposition(dto);
                    const energies = graph.applyDecomposition(resultDto);

                    if (energies) {
                        legendSection.classList.remove('hidden');

                        // Helper to format energies nicely
                        const formatEnergy = (val) => {
                            if (val > 10000 || (val < 0.001 && val > 0)) return val.toExponential(2);
                            return val.toFixed(2);
                        };

                        document.getElementById('statTotal').innerText = formatEnergy(energies.totalEnergy);
                        document.getElementById('statGrad').innerText = formatEnergy(energies.gradEnergy);
                        document.getElementById('statRot').innerText = formatEnergy(energies.rotEnergy);
                        document.getElementById('statHarm').innerText = formatEnergy(energies.harmEnergy);
                    }
                } catch (e) {
                    console.error("Decomposition failed.", e);
                    alert("Decomposition failed. Check console.");
                } finally {
                    runDecompBtn.innerHTML = '<span class="btn-text">Run Decomposition</span><span class="btn-icon"></span>';
                    runDecompBtn.style.opacity = '1';
                }
            }, 50);

        } catch (e) {
            console.error(e);
        }
    });

    // Legend interactivity
    const legendItems = document.querySelectorAll('.legend-item.interactive');
    legendItems.forEach(item => {
        item.addEventListener('click', () => {
            // Find active ones
            const isActive = item.classList.contains('active');

            // Clear all
            legendItems.forEach(i => i.classList.remove('active'));

            if (isActive) {
                // Was active, disable filter
                graph.applyLayerFilter(null);
            } else {
                // Activate this one
                item.classList.add('active');
                graph.applyLayerFilter(item.dataset.filter);
            }
        });
    });
});
