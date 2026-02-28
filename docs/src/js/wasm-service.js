import { WASI, File, OpenFile, ConsoleStdout } from "@bjorn3/browser_wasi_shim";

export class WasmService {
    constructor() {
        this.wasmModule = null;
        this.wasmInstance = null;
        this.memory = null;
    }

    async init() {
        try {
            const args = ["engine.wasm"];
            const env = [];
            const fds = [
                new OpenFile(new File([])), // stdin
                ConsoleStdout.lineBuffered(msg => console.log(`[WASM stdout] ${msg}`)),
                ConsoleStdout.lineBuffered(msg => console.warn(`[WASM stderr] ${msg}`))
            ];

            const wasi = new WASI(args, env, fds);

            // Fetch engine.wasm and compile it 
            // In a production environment like GitHub Pages, we want standard browser caching
            const response = await fetch('engine.wasm');

            const buffer = await response.arrayBuffer();
            this.wasmModule = await WebAssembly.compile(buffer);

            const imports = {
                wasi_snapshot_preview1: wasi.wasiImport,
            };

            this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, imports);

            // Initialize WASI reactor
            wasi.initialize(this.wasmInstance);

            // the Haskell entrypoint hs_init must be called to setup runtime
            if (this.wasmInstance.exports.hs_init) {
                // Pass dummy argc=0 and argv=NULL
                this.wasmInstance.exports.hs_init(0, 0);
            }

            this.memory = this.wasmInstance.exports.memory;

            return true;
        } catch (error) {
            console.error("Failed to initialize WASM Sandbox:", error);
            throw error;
        }
    }

    // Helper: string to utf-8 pointer
    _writeStringToMemory(str) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str + '\0');

        // Allocate space
        const ptr = this.wasmInstance.exports.malloc(bytes.length);

        // Write bytes to memory
        const memoryView = new Uint8Array(this.memory.buffer, ptr, bytes.length);
        memoryView.set(bytes);

        return { ptr, len: bytes.length };
    }

    // Helper: extract null terminated string from pointer
    _readStringFromMemory(ptr) {
        const memoryView = new Uint8Array(this.memory.buffer);
        let endPtr = ptr;
        while (memoryView[endPtr] !== 0) {
            endPtr++;
        }

        const bytes = new Uint8Array(this.memory.buffer, ptr, endPtr - ptr);
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }

    runDecomposition(graphDto) {
        if (!this.wasmInstance) {
            throw new Error("WASM not initialized");
        }

        const jsonStr = JSON.stringify(graphDto);
        console.log("Input to WASM:", jsonStr);

        let ptrObj = null;
        let pResult = null;

        try {
            ptrObj = this._writeStringToMemory(jsonStr);
            console.log("Written to memory pointer:", ptrObj.ptr);

            // Call the exported haskell function
            pResult = this.wasmInstance.exports.run_decomposition(ptrObj.ptr);

            // Read result from memory
            const resultStr = this._readStringFromMemory(pResult);
            console.log("Output from WASM:", resultStr);

            const resultDto = JSON.parse(resultStr);
            return resultDto;
        } catch (error) {
            console.error("Error generating decomposition in WASM:", error);
            throw error;
        } finally {
            // Cleanup memory
            if (ptrObj && ptrObj.ptr) {
                this.wasmInstance.exports.free(ptrObj.ptr);
            }
            if (pResult) {
                this.wasmInstance.exports.free_haskell_string(pResult);
            }
        }
    }
}
