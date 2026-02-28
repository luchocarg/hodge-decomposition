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
        wasmStatusText.textContent = 'Engine Ready';
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
                    graph.applyDecomposition(resultDto);
                    legendSection.classList.remove('hidden');
                } catch (e) {
                    console.error("Decomposition failed.", e);
                    alert("Decomposition failed. Check console.");
                } finally {
                    runDecompBtn.innerHTML = '<span class="btn-text">Run Decomposition</span><span class="btn-icon">⚡</span>';
                    runDecompBtn.style.opacity = '1';
                }
            }, 50);

        } catch (e) {
            console.error(e);
        }
    });
});
