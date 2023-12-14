/** @type {HTMLInputElement} */
const cbMultithreaded = document.getElementById('mt-checkbox');

const btnLoadScript = document.getElementById('load-script');
const btnBootstrapModule = document.getElementById('bootstrap-module');
const btnInitHeavyObj = document.getElementById('init-heavy-obj');
const btnRun = document.getElementById('run');

const btnDestroyHeavyObject = document.getElementById('destroy-heavy-object');
const btnRemoveModuleReference = document.getElementById('remove-module-reference');
const btnUnloadScript = document.getElementById('unload-script');

const divConsole = document.getElementById('console');

function printMsg(message) {
    const msg = document.createElement('p');
    msg.classList.add('msg');
    msg.innerText = message;
    divConsole.appendChild(msg);
    console.log(message);
}

function printError(e) {
    let errString;

    if ((typeof e) === 'string') {
        errString = `Failed to bootstrap app: ${e}`;
    } else if (e instanceof Error) {
        errString = `Failed to bootstrap app: ${e.message}`;
    } else {
        errString = `Failed to bootstrap app: ${e}`;
    }

    const msg = document.createElement('p');
    msg.classList.add('err-msg');
    msg.innerText = errString;
    divConsole.appendChild(msg);
    console.error(errString, e);
}

function logOnErr(fn) {
    return async () => {
        try {
            await fn();
        } catch (e) {
            printError(e);
        }
    };
}

async function loadScript(multithreaded) {
    const src = multithreaded ? '/builds/sample-multi-threaded.js' : '/builds/sample-single-threaded.js';

    return new Promise((resolve, reject) => {
        const scriptElement = document.createElement('script');
        scriptElement.onload = () => resolve(scriptElement);
        scriptElement.onerror = (e) => reject({e, scriptElement});
        scriptElement.src = src;
        document.body.appendChild(scriptElement);
    });
}

async function bootstrap() {
    //
    // STATE
    let wasmScript = null;
    let wasmModuleBootstrapFn = null;
    let wasmModuleInstance = null;
    let heavyObject = null;

    //
    // UI STATE UPDATES
    const setDisabled = (ele, disabled) => {
        if (disabled) {
            ele.classList.add('disabled');
        } else {
            ele.classList.remove('disabled');
        }
    }
    const updateButtons = () => {
        setDisabled(btnLoadScript, wasmScript != null);
        setDisabled(btnBootstrapModule, wasmModuleInstance != null);
        setDisabled(btnInitHeavyObj, wasmModuleInstance == null || heavyObject != null);
        setDisabled(btnRun, heavyObject == null);

        setDisabled(btnDestroyHeavyObject, heavyObject == null);
        setDisabled(btnRemoveModuleReference, wasmModuleInstance == null);
        setDisabled(btnUnloadScript, wasmScript == null);
    };

    //
    // UI EVENT HANDLERS
    btnLoadScript.classList.remove('disabled');
    btnLoadScript.addEventListener('click', logOnErr(async () => {
        if (btnLoadScript.classList.contains('disabled')) return;

        btnLoadScript.classList.add('disabled');

        cbMultithreaded.disabled = true;
        const multithreaded = cbMultithreaded.checked;

        wasmScript = await loadScript(multithreaded);
        printMsg(`Loaded ${multithreaded ? 'multithreaded' : 'singlethreaded'} JavaScript bootstrapping code`);

        const wasmModuleBootstrapPropName = multithreaded ? 'HeavyObjectDemoModuleMT' : 'HeavyObjectDemoModuleST';
        wasmModuleBootstrapFn = window[wasmModuleBootstrapPropName];
        if (wasmModuleBootstrapFn == null) {
            throw new Error(`Could not find bootstrapping function ${wasmModuleBootstrapPropName}`);
        }

        updateButtons();
    }));

    btnBootstrapModule.addEventListener('click', logOnErr(async () => {
        if (btnBootstrapModule.classList.contains('disabled')) return;

        if (!wasmModuleBootstrapFn) {
            throw new Error('Missing WASM bootstrapping function reference (bug in demo)');
        }

        btnBootstrapModule.classList.add('disabled');

        printMsg('Initializing WASM module...');
        printMsg('-- This will load JavaScript and WebAssembly modules, and create WebWorkers in multithreaded builds');
        wasmModuleInstance = await new Promise((resolve, reject) => {
            wasmModuleBootstrapFn().then(resolve, reject);
        });
        printMsg('-- Done!');

        if (!wasmModuleInstance) {
            throw new Error('Failed to construct WASM module instance for some reason');
        }

        updateButtons();
    }));

    btnInitHeavyObj.addEventListener('click', logOnErr(async () => {
        if (btnInitHeavyObj.classList.contains('disabled')) return;

        if (!wasmModuleInstance) {
            throw new Error('Cannot initialize heavy object - WASM module instance not found');
        }

        if (heavyObject != null) {
            throw new Error('Heavy object instance already exists!');
        }

        heavyObject = new wasmModuleInstance['HeavyObject']();
        printMsg('HeavyObject created');

        updateButtons();
    }));

    btnRun.addEventListener('click', logOnErr(async () => {
        if (btnRun.classList.contains('disabled')) return;

        if (heavyObject == null) {
            throw new Error('Cannot run - heavy object instance is not initialized!');
        }

        const size = heavyObject['len']();

        printMsg(`Heavy object is ${size} bytes large`);
        updateButtons();
    }));

    btnDestroyHeavyObject.addEventListener('click', logOnErr(async () => {
        if (btnDestroyHeavyObject.classList.contains('disabled')) return;

        if (heavyObject == null) {
            throw new Error('Cannot destroy heavy object, it does not exist!');
        }

        heavyObject['delete']();
        heavyObject = null;

        printMsg('Deleted the heavy object');
        updateButtons();
    }));

    btnRemoveModuleReference.addEventListener('click', logOnErr(async () => {
        if (btnRemoveModuleReference.classList.contains('disabled')) return;

        if (wasmModuleInstance == null) {
            throw new Error('WASM module instance is already null');
        }

        wasmModuleInstance.PThread?.terminateAllThreads();

        wasmModuleInstance = null;

        updateButtons();
    }));

    btnUnloadScript.addEventListener('click', logOnErr(async () => {
        if (btnUnloadScript.classList.contains('disabled')) return;

        if (wasmScript == null) {
            throw new Error('WASM script is already unloaded');
        }

        wasmScript.remove();
        wasmScript = null;

        printMsg('Removed WASM bootstrapping script from DOM');

        updateButtons();
    }));
}

bootstrap().catch((e) => {
    printError(e);
});
