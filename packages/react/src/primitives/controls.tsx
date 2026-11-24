import type { DilHandler, ResolvedProps } from "@kkkiio/dil-core";
import { createContext, type ReactNode, useContext, useId, useRef, useState } from "react";
import { type DilButtonComponentProps, useDilComponents } from "../components-context.ts";
import { useDilRuntime } from "../runtime-context.ts";
import { cn } from "../utils.ts";

function DefaultButton({ size = "default", variant = "outline", className, ...rest }: DilButtonComponentProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "default" && "h-9 px-4 text-sm",
        size === "lg" && "h-10 px-6 text-sm",
        variant === "default"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...rest}
    />
  );
}

function DefaultSpinner({
  className,
  "aria-label": ariaLabel,
}: {
  readonly className?: string;
  readonly "aria-label"?: string;
}) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      role="status"
    />
  );
}

function DefaultTextarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

export interface ControlProps {
  readonly props: ResolvedProps;
  readonly children?: ReactNode;
}

/** `md` is the corpus' default; anything unknown falls back to it. */
const BUTTON_SIZE = { sm: "sm", md: "default", lg: "lg" } as const;

function buttonSize(value: unknown): "sm" | "default" | "lg" {
  return typeof value === "string" ? (BUTTON_SIZE[value as keyof typeof BUTTON_SIZE] ?? "default") : "default";
}

export function ControlButton({ props, children }: ControlProps) {
  const context = useDilRuntime();
  const { Button = DefaultButton, Spinner = DefaultSpinner } = useDilComponents();
  const handler = props.onClick as DilHandler | undefined;
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const sends = handler ? context?.sends.has(handler.id) === true : false;
  const host = context?.host ?? null;
  const blocked = sends && (host === null || host.busy);
  const color = typeof props.color === "string" ? props.color : undefined;

  const onClick = async () => {
    if (!context || !handler) return;
    setFailed(false);
    if (sends) setSending(true);
    try {
      await context.runtime.invoke(handler, [], () => setSending(true));
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <Button
        aria-busy={sending || undefined}
        className={cn(props.block === true && "w-full", sending && "gap-2")}
        data-dil-action={sends ? "issueNewTurn" : undefined}
        disabled={blocked || sending}
        onClick={onClick}
        size={buttonSize(props.size)}
        title={sends ? "Sends a new message" : undefined}
        type="button"
        variant={color === "primary" || sends ? "default" : "outline"}
      >
        {children}
        {sending && <Spinner aria-label="Sending" className="size-3" />}
      </Button>
      {failed && (
        <span className="text-destructive text-xs" role="alert">
          Could not send. The host may be busy or disconnected.
        </span>
      )}
    </span>
  );
}

interface RadioGroupContextValue {
  readonly selected: unknown;
  readonly select: (value: unknown) => void;
  readonly disabled: boolean;
  /** One native radio group per `<radio-group>`, so arrow keys move between options. */
  readonly name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function ControlRadioGroup({ props, children }: ControlProps) {
  const context = useDilRuntime();
  const name = useId();
  const handler = props.onChange as DilHandler | undefined;
  const [draft, setDraft] = useState<{ value: unknown }>();
  const version = useRef(0);
  const select = (value: unknown) => {
    if (!context || !handler) return;
    const edit = ++version.current;
    setDraft({ value });
    void context.runtime
      .invoke(handler, [value])
      .catch(() => undefined)
      .finally(() => {
        if (edit === version.current) setDraft(undefined);
      });
  };
  const disabled = !context || !handler;
  const value = { selected: draft ? draft.value : props.value, select, disabled, name };
  return (
    <RadioGroupContext.Provider value={value}>
      <div
        aria-disabled={disabled || undefined}
        className={cn(
          "flex min-w-0 gap-1.5",
          props.direction === "row" ? "flex-row flex-wrap items-center gap-4" : "flex-col",
        )}
        role="radiogroup"
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function ControlRadio({ props, children }: ControlProps) {
  const group = useContext(RadioGroupContext);
  const checked = group !== null && sameValue(group.selected, props.value);
  return (
    <label className={cn("flex min-w-0 items-start gap-2 text-sm", group?.disabled ? "opacity-60" : "cursor-pointer")}>
      <input
        checked={checked}
        className="mt-[3px] size-3.5 shrink-0 accent-primary"
        disabled={group?.disabled ?? true}
        name={group?.name}
        onChange={() => group?.select(props.value)}
        type="radio"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/** A form field heading. The corpus writes `<label>` with no props and no `for`. */
export function ControlLabel({ children }: ControlProps) {
  return <div className="font-medium text-foreground text-sm">{children}</div>;
}

export function ControlTextarea({ props }: ControlProps) {
  const context = useDilRuntime();
  const { Textarea = DefaultTextarea } = useDilComponents();
  const handler = props.onChange as DilHandler | undefined;
  const rows = typeof props.rows === "number" && props.rows > 0 ? Math.min(props.rows, 20) : 3;
  const [draft, setDraft] = useState<string>();
  const version = useRef(0);
  return (
    <Textarea
      className="resize-y text-sm"
      disabled={!context || !handler}
      onChange={(event) => {
        if (!context || !handler) return;
        const value = event.currentTarget.value;
        const edit = ++version.current;
        setDraft(value);
        void context.runtime
          .invoke(handler, [value])
          .catch(() => undefined)
          .finally(() => {
            if (edit === version.current) setDraft(undefined);
          });
      }}
      placeholder={typeof props.placeholder === "string" ? props.placeholder : undefined}
      rows={rows}
      value={draft ?? text(props.value)}
    />
  );
}

/** `value` is a DIL value, not a DOM string: numbers and booleans format like they do in prose. */
function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function sameValue(a: unknown, b: unknown): boolean {
  return Object.is(a, b) || (a !== undefined && b !== undefined && String(a) === String(b));
}

function DefaultInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

/** `checkbox` (#4): a toggle bound to the document state, like `radio` without a group. */
export function ControlCheckbox({ props, children }: ControlProps) {
  const context = useDilRuntime();
  const handler = props.onChange as DilHandler | undefined;
  const [draft, setDraft] = useState<boolean>();
  const version = useRef(0);
  const checked = draft ?? props.checked === true;
  const disabled = !context || !handler;

  const toggle = () => {
    if (!context || !handler) return;
    const next = !checked;
    const edit = ++version.current;
    setDraft(next);
    void context.runtime
      .invoke(handler, [next])
      .catch(() => undefined)
      .finally(() => {
        if (edit === version.current) setDraft(undefined);
      });
  };

  return (
    <label className={cn("flex min-w-0 items-start gap-2 text-sm", disabled ? "opacity-60" : "cursor-pointer")}>
      <input
        checked={checked}
        className="mt-[3px] size-3.5 shrink-0 accent-primary"
        disabled={disabled}
        onChange={toggle}
        type="checkbox"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/** `input` (#4): a single-line text field; `required` marks the field for the form. */
export function ControlInput({ props }: ControlProps) {
  const context = useDilRuntime();
  const handler = props.onChange as DilHandler | undefined;
  const [draft, setDraft] = useState<string>();
  const version = useRef(0);
  return (
    <DefaultInput
      disabled={!context || !handler}
      onChange={(event) => {
        if (!context || !handler) return;
        const value = event.currentTarget.value;
        const edit = ++version.current;
        setDraft(value);
        void context.runtime
          .invoke(handler, [value])
          .catch(() => undefined)
          .finally(() => {
            if (edit === version.current) setDraft(undefined);
          });
      }}
      placeholder={typeof props.placeholder === "string" ? props.placeholder : undefined}
      required={props.required === true}
      value={draft ?? text(props.value)}
    />
  );
}

/**
 * `form` (#4): groups input controls and runs `onSubmit` on the implicit submission —
 * Enter in a field, or a submit button the host renders. Nothing is sent anywhere: the
 * handler is ordinary document state, exactly like `onClick`.
 */
export function ControlForm({ props, children }: ControlProps) {
  const context = useDilRuntime();
  const handler = props.onSubmit as DilHandler | undefined;
  const gap = typeof props.gap === "number" && props.gap > 0 ? Math.min(props.gap, 8) : 2;
  return (
    <form
      className={cn("flex min-w-0 flex-col", `gap-${gap}`)}
      onSubmit={(event) => {
        event.preventDefault();
        if (context && handler) void context.runtime.invoke(handler).catch(() => undefined);
      }}
    >
      {children}
    </form>
  );
}
