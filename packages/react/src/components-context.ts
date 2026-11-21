import {
  type ButtonHTMLAttributes,
  type ComponentType,
  createContext,
  type ReactNode,
  type TextareaHTMLAttributes,
  useContext,
} from "react";

export interface DilButtonComponentProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly size?: "sm" | "default" | "lg";
  readonly variant?: "default" | "outline";
}

export interface DilCodeBlockComponentProps {
  readonly code: string;
  readonly language?: string;
}

export interface DilMermaidComponentProps {
  readonly code: string;
}

export interface DilFallbackMarkdownProps {
  readonly markdown: string;
}

/**
 * Optional host UI overrides so design systems (e.g. shadcn/ui, MUI, Shiki, Mermaid)
 * can plug into `<DilRenderer components={...} />` without forking the renderer.
 */
export interface DilComponents {
  readonly Button?: ComponentType<DilButtonComponentProps>;
  readonly Textarea?: ComponentType<TextareaHTMLAttributes<HTMLTextAreaElement>>;
  readonly Spinner?: ComponentType<{ readonly className?: string; readonly "aria-label"?: string }>;
  readonly CodeBlock?: ComponentType<DilCodeBlockComponentProps>;
  readonly Mermaid?: ComponentType<DilMermaidComponentProps>;
  readonly FallbackMarkdown?: ComponentType<DilFallbackMarkdownProps>;
}

export const DilComponentsContext = createContext<DilComponents>({});

export function useDilComponents(): DilComponents {
  return useContext(DilComponentsContext);
}

export type DilRenderFallback = (markdown: string) => ReactNode;
