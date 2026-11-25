(() => {
  const LIMIT = 5_000;
  const MAX_TEXT = 1_000_000;
  const NativeFunction = Function;
  const copy = structuredClone;
  const trim = (value) => (typeof value === "string" ? value.trim() : "");
  const isArray = Array.isArray;

  function sanitize(value, budget, depth = 0) {
    if (--budget.nodes < 0 || depth > 16) throw new Error("DIL value exceeds its size limit");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
      budget.text -= value.length;
      if (budget.text < 0) throw new Error("DIL value exceeds its text limit");
      return value;
    }
    if (isArray(value)) {
      if (value.length > budget.nodes) throw new Error("DIL list exceeds its size limit");
      return value.map((item) => sanitize(item, budget, depth + 1));
    }
    if (value && typeof value === "object") {
      const fields = Object.keys(value);
      if (fields.length > budget.nodes) throw new Error("DIL object exceeds its size limit");
      return Object.fromEntries(
        fields.map((key) => {
          sanitize(key, budget);
          return [key, sanitize(value[key], budget, depth + 1)];
        }),
      );
    }
    return undefined;
  }

  /** Assemble a runnable JS body and its data using the worker's native syntax checks. */
  const HOST_COMPONENTS = ["Cite", "Link", "Entity", "AsyncImage", "AsyncImageGroup"];
  const SAFE_PRELUDE =
    "function __dilSafe(evaluate,failureValue){try{return evaluate()}catch{return failureValue}}";
  const COUNTING_PRELUDE =
    "function __dilSafe(evaluate,failureValue){try{return evaluate()}catch{DIL.__safeError();return failureValue}}";

  /** Execute DIL artifacts: run the compiled program and resolve its tree, state, and
   *  handlers. `load` takes `{ code, constants, appData }`; `trigger` replays an event. */
  function createExecutor(initialState = {}) {
    let slots = new Map(Object.entries(initialState));
    let compiled;
    let constants;
    let appData;
    let handlers = new Map();
    let buttons = [];
    let artifact;
    let effects;
    let updating = false;
    let anonymous = 0;

    const GenUI = Object.freeze({
      issueNewTurn(value) {
        const prompt = trim(value);
        if (effects && prompt && prompt.length <= MAX_TEXT && effects.length === 0) effects.push(prompt);
      },
    });
    const DIL = {
      Fragment: Symbol("fragment"),
      jsx(type, props, ...children) {
        if (typeof type === "function") return type();
        return { type, props: props ?? {}, children };
      },
      render(node) {
        DIL.__root = node;
      },
      useConstants() {
        return constants;
      },
      useAppData(select) {
        return select ? select(appData) : appData;
      },
      useState(initial, options) {
        const slot = typeof options?.key === "string" ? options.key : `anonymous:${anonymous++}`;
        if (!slots.has(slot)) slots.set(slot, initial);
        return [
          slots.get(slot),
          (next) => {
            if (!updating) return;
            const previous = slots.get(slot);
            const value = typeof next === "function" ? next(previous) : next;
            if (!Object.is(value, previous)) slots.set(slot, value);
          },
        ];
      },
      __root: undefined,
      __safeError() {
        DIL.__errors += 1;
      },
      __errors: 0,
    };

    function resolve(artifact) {
      anonymous = 0;
      DIL.__errors = 0;
      DIL.__root = undefined;
      handlers = new Map();
      buttons = [];
      const budget = { nodes: LIMIT * 8, text: MAX_TEXT };
      let nodes = LIMIT;
      const body = artifact.code.startsWith(SAFE_PRELUDE)
        ? COUNTING_PRELUDE + artifact.code.slice(SAFE_PRELUDE.length)
        : artifact.code;
      compiled = new NativeFunction(
        "DIL",
        "GenUI",
        "__dil",
        ...HOST_COMPONENTS,
        `"use strict";\n${body}`,
      );
      const convert = (value, depth) => {
        if (value == null || typeof value === "boolean" || typeof value === "function") return [];
        if (typeof value === "string" || typeof value === "number") {
          if (--nodes < 0 || depth > 16) throw new Error("DIL tree exceeds its node budget");
          budget.text -= String(value).length;
          if (budget.text < 0) throw new Error("DIL tree exceeds its text budget");
          return value === "" ? [] : [{ kind: "text", value: String(value) }];
        }
        if (isArray(value)) return value.flatMap((item) => convert(item, depth));
        if (typeof value !== "object" || depth > 16) return [];
        const node = value;
        if (node.type === DIL.Fragment) return convert(node.children, depth);
        if (typeof node.type !== "string") return [];
        if (--nodes < 0 || depth > 16) throw new Error("DIL tree exceeds its node budget");
        const props = Object.create(null);
        for (const [name, prop] of Object.entries(node.props ?? {})) {
          if ((name === "onClick" || name === "onChange" || name === "onSubmit") && typeof prop === "function") {
            const id = `h${handlers.size}`;
            handlers.set(id, prop);
            props[name] = { id };
            if (node.type === "button" && name === "onClick") buttons.push(id);
            continue;
          }
          let property;
          try {
            property = prop == null ? undefined : sanitize(prop, budget);
          } catch {
            property = undefined;
          }
          if (property !== undefined) props[name] = property;
        }
        return [{ kind: "element", name: node.type, props, children: convert(node.children, depth + 1) }];
      };
      compiled(DIL, GenUI, DIL, ...HOST_COMPONENTS);
      if (DIL.__root === undefined) throw new Error("DIL artifact did not render a tree");
      const tree = convert(DIL.__root, 0);
      if (!isArray(tree)) throw new Error("DIL artifact did not render a tree");
      const state = sanitize(Object.fromEntries(slots), budget);
      return { tree, handlers, buttons, state, errors: DIL.__errors };
    }

    return {
      load(next) {
        artifact = next;
        constants = artifact.constants ?? {};
        appData = artifact.appData ?? {};
        const before = new Map(slots);
        try {
          const next = resolve(artifact);
          return { tree: next.tree, buttons: next.buttons, state: next.state, effects: [], errors: next.errors };
        } catch (error) {
          slots = before;
          throw error;
        }
      },
      probe(id) {
        const handler = handlers.get(id);
        if (!handler) return false;
        const recorded = [];
        effects = recorded;
        try {
          handler();
        } catch {
        } finally {
          effects = undefined;
        }
        return recorded.length > 0;
      },
      trigger(id, args = []) {
        if (!compiled || !handlers.has(id)) return null;
        const before = new Map(slots);
        const performed = [];
        effects = performed;
        updating = true;
        try {
          handlers.get(id)(...args);
          updating = false;
          effects = undefined;
          const next = resolve(artifact);
          return { tree: next.tree, buttons: next.buttons, state: next.state, effects: performed, errors: next.errors };
        } catch {
          slots = before;
          return null;
        } finally {
          updating = false;
          effects = undefined;
        }
      },
    };
  }
  if (typeof exports === "object") {
    exports.createExecutor = createExecutor;
  }

  if (
    typeof self !== "undefined" &&
    typeof self.document === "undefined" &&
    typeof self.addEventListener === "function"
  ) {
    self.addEventListener(
      "message",
      (event) => {
        const port = event.ports[0];
        if (!port) return;
        const send = port.postMessage.bind(port);
        const receive = port.addEventListener.bind(port);
        const program = createExecutor(event.data.state);
        for (const name of ["Worker", "SharedWorker", "BroadcastChannel", "postMessage", "importScripts", "close"]) {
          Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
        }
        const task = event.data.intent;
        if (task) {
          for (const handler of task.buttons) {
            try {
              const specimen = createExecutor(copy(event.data.state));
              specimen.load(task.artifact);
              if (specimen.probe(handler)) send({ handler });
            } catch {}
          }
          send({ done: true });
          return;
        }
        let revision = 0;
        receive("message", ({ data }) => {
          const { id, request } = data;
          let result = null;
          try {
            if (request.kind === "load") {
              result = program.load(request.artifact);
              revision = request.revision;
            } else if (request.kind === "trigger" && request.revision === revision) {
              result = program.trigger(request.handler, request.args);
            }
            if (result) result = copy(result);
          } catch {
            result = null;
          }
          send({ id, result });
        });
        port.start();
        send({ ready: true });
      },
      { once: true },
    );
  }
})();
