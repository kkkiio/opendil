import type { CompiledArtifact, DilHandler } from "@kkkiio/dil-core";
import type { DilHost, DilSandbox, DirectRuntime } from "@kkkiio/dil-runtime";
import { createContext, useContext } from "react";

/** The surface a renderer's controls need, satisfied by both DilSandbox and DirectRuntime. */
export interface DilRuntimeHandle {
  update(artifact: CompiledArtifact | undefined): void;
  setVisible(visible: boolean): void;
  invoke(handler: DilHandler, args?: unknown[], onSend?: () => void): Promise<void>;
  stop(): void;
}

type DilRuntime = DilRuntimeHandle & (DilSandbox | DirectRuntime);

/** What a control needs from the renderer above it: the document's runtime, and the host. */
export interface DilRuntimeValue {
  readonly runtime: DilRuntime;
  readonly sends: ReadonlySet<string>;
  readonly host: DilHost | null;
}

/**
 * Provided by the app (app.tsx) for the whole transcript: the browser half of
 * GenUI. Absent outside an activated Web UI session, which makes issueNewTurn
 * unavailable instead of silently inert.
 */
export const DilHostContext = createContext<DilHost | null>(null);

/**
 * Provided by DilRenderer for one message. Controls read it instead of receiving the
 * runtime through props, because renderNode is a plain function, not a component.
 */
export const DilRuntimeContext = createContext<DilRuntimeValue | null>(null);

export function useDilRuntime(): DilRuntimeValue | null {
  return useContext(DilRuntimeContext);
}
