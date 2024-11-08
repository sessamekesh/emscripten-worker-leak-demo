## Problem:

Single-threaded modules act appropriately - they initialize memory that is later freed when the module reference is destroyed.

Multi-threaded modules, on the other hand, _retain_ that memory... somewhere. The purpose of this repository is to both demonstrate this effect, and (hopefully!) debug it a bit myself.

## Running the demo:

```bash
node ./simple-server.js
```

Open up a browser to `http://localhost:8000`.

For single-threaded runs:

1. Un-check the "multithreaded" checkbox.
2. Inspect the browser memory usage in browser memory tools.
3. Click "Load Script", then "Bootstrap Module", and "Initialize Heavy Object".
4. Inspect memory again. _Notice the usage is higher_.
5. Click "Delete Heavy Object". Notice the memory usage is the same - this is by design (app has not been terminated).
6. Click "Destroy Module Reference".
7. Inspect memory again. _Notice the usage is back to what it was before._

Do the same thing for multi-threaded runs (except leaving the "multithreaded" checkbox checked).

Notice that in Step 7, the memory usage is still elevated.

I've reproduced this on Chrome and Firefox - it seems to be a memory leak in Emscripten-generated glue code.

## Compiling the WASM module + Emscripten glue:

I've included pre-built binaries here, but this is the instructions for generating them.

When comitting any changes to the C++ code or build instructions, please also commit an updated `builds` directory using a recent version of the Emscripten toolchain!

1. First, make sure `emsdk_env` has been run for your environment.
2. Then, invoke `emcc` as follows _for the single-threaded build_:

```bash
emcc -sWASM -sMODULARIZE -sENVIRONMENT="web,worker" -sALLOW_MEMORY_GROWTH -sEXIT_RUNTIME=0 -sFILESYSTEM=0 -sEXPORT_NAME="HeavyObjectDemoModuleST" -sASSERTIONS=0 -sRUNTIME_DEBUG=0 --no-entry --bind sample.cc -o builds/sample-single-threaded.js
```

3. Next, invoke `emcc` for the _multi-threaded_ build:

```bash
emcc -sWASM -sMODULARIZE -sENVIRONMENT="web,worker" -sALLOW_MEMORY_GROWTH -sEXIT_RUNTIME=0 -sFILESYSTEM=0 -sEXPORT_NAME="HeavyObjectDemoModuleMT" -sEXPORTED_RUNTIME_METHODS=PThread -sUSE_PTHREADS -sPTHREAD_POOL_SIZE=4 -sASSERTIONS=0 -sRUNTIME_DEBUG=0 --no-entry --bind -pthread sample.cc -o builds/sample-multi-threaded.js
```