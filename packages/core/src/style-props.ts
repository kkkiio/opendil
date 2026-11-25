/**
 * The DIL style-props table — the presentation attribute vocabulary, one registry above the
 * tag vocabulary in `vocabulary.ts`.
 *
 * DIL styling is *style props over design tokens*, not CSS: names are re-encoded
 * (`radius`, not `border-radius`; `align`/`justify`, not `align-items`/`justify-content`),
 * values are token enums or a 4px spacing scale, and `border` is a structured object
 * instead of a CSS shorthand. The captured corpus never writes a verbatim CSS property
 * name or a class string — this table is that fact, made mechanical.
 *
 * The dialect is closed-world: what the captured ChatGPT corpus shows is what the
 * renderer accepts, and nothing more. The corpus records what the model was trained to
 * emit; accepting beyond it would render our invention, not the dialect. Every entry
 * carries evidence of exactly one kind:
 *
 *   corpus    the captured dialect used it; refs point into the `generative-ui-research`
 *             sample corpus (e.g. `L01-M30`)
 *   inferred  not observed on this tag, but derived from its mechanism family — `col`
 *             mirrors `row`, the same flex container on the other axis; the note states
 *             the derivation
 *   lowered   our Markdown lowering emits it (never model-written)
 *
 * There are currently zero known corpus-written attributes the renderer does not accept.
 * An extension mechanism beyond this evidence is deliberately absent until designed.
 *
 * Out of scope by design (and where they live instead):
 *
 *   component props   `marker` (list), `name` (icon), `value`, handlers — read by the
 *                     components themselves, semantically not styling
 *   SVG geometry      `x`, `y`, `fill`, `stroke`, `viewBox`… — `svg-map.ts` owns that
 *                     vocabulary; it is already a safe declarative one
 */

/** The value forms a style prop may take. */
export type PropForm = "boolean" | "enum" | "scale" | "length" | "number" | "color" | "object";

/** One attribute on one tag: what the renderer accepts, and why we believe it. */
export interface StylePropEntry {
  /** The value forms the renderer resolves; anything else is dropped, never an error. */
  readonly forms: readonly PropForm[];
  /** The named tokens for the `enum` form. */
  readonly values?: readonly string[];
  /** A representative valid value — drives the generated renderer matrix test. */
  readonly sample: boolean | number | string | Readonly<Record<string, unknown>>;
  /** Captured samples that used this attribute. */
  readonly corpus?: readonly string[];
  /** Derived from a mechanism sibling rather than observed on this tag; `note` states how. */
  readonly inferred?: true;
  /** Emitted by our Markdown lowering; the model never writes it. */
  readonly lowered?: true;
  readonly note?: string;
}

/** All attributes of one tag; an empty record means the tag takes no style props. */
export type StylePropsOfTag = Readonly<Record<string, StylePropEntry>>;

const ALIGN = ["start", "center", "end", "baseline", "stretch"] as const;
const JUSTIFY = ["start", "center", "end", "between", "around", "evenly"] as const;
const RADIUS = ["none", "xs", "sm", "md", "lg", "xl", "full"] as const;
const TEXT_SIZE = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
const ICON_SIZE = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
const WEIGHT = ["normal", "medium", "semibold", "bold"] as const;
const TEXT_ALIGN = ["left", "start", "center", "right", "end", "justify"] as const;
const SURFACE = [
  "default",
  "surface",
  "surface-secondary",
  "surface-tertiary",
  "card",
  "muted",
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
  "destructive",
  "info",
  "surface-inverted",
] as const;
const FOREGROUND = [
  "default",
  "primary",
  "secondary",
  "muted",
  "accent",
  "success",
  "warning",
  "danger",
  "destructive",
  "info",
  "tertiary",
  "subtle",
] as const;

export const STYLE_PROPS: Readonly<Record<string, StylePropsOfTag>> = {
  box: {
    gap: {
      forms: ["scale", "length"],
      sample: 2,
      corpus: ["L01-M30"],
      note: "also accepts literal lengths",
    },
    padding: {
      forms: ["scale", "object"],
      sample: 2,
      corpus: ["L01-M30", "L01-M69"],
      note: "the object form takes x/y or per-side scale numbers",
    },
    background: {
      forms: ["enum", "color"],
      values: SURFACE,
      sample: "surface-secondary",
      corpus: ["L01-M30", "L12-M16"],
    },
    border: {
      forms: ["boolean", "object"],
      sample: true,
      corpus: ["L01-M69", "L05-M29"],
      note: "the object form is {size: 1|2|4|8, color: token|literal, style: solid|dashed|dotted}",
    },
    radius: { forms: ["enum"], values: RADIUS, sample: "lg", corpus: ["L01-M30", "L01-M69"] },
    clip: { forms: ["boolean"], sample: true, corpus: ["L01-M30"] },
    align: {
      forms: ["enum"],
      values: ALIGN,
      sample: "center",
      corpus: ["L01-M69"],
      note: "stacks the box into a column",
    },
    justify: { forms: ["enum"], values: JUSTIFY, sample: "center", corpus: ["L05-M29"] },
    width: { forms: ["length"], sample: "100%", corpus: ["L01-M30", "L01-M69"] },
    height: { forms: ["length"], sample: "100%", corpus: ["L01-M30", "L06-M14"] },
    minHeight: { forms: ["length"], sample: "76px", corpus: ["L05-M29"] },
    flex: {
      forms: ["number"],
      sample: 1,
      corpus: ["L01-M30", "L14-M14", "L16-M3"],
      note: 'also accepts "auto"',
    },
    size: {
      forms: ["length"],
      sample: "12px",
      corpus: ["L08-M18"],
      note: "width and height shorthand, observed as legend swatches (small filled squares)",
    },
  },

  row: {
    align: { forms: ["enum"], values: ALIGN, sample: "center", corpus: ["L01-M30", "L16-M3"] },
    justify: { forms: ["enum"], values: JUSTIFY, sample: "between", corpus: ["L01-M30", "L04-M24"] },
    gap: {
      forms: ["scale", "length"],
      sample: 2,
      corpus: ["L01-M30", "L01-M69"],
      note: "also accepts literal lengths",
    },
    wrap: {
      forms: ["boolean", "enum"],
      values: ["wrap"],
      sample: true,
      corpus: ["L01-M69"],
      note: 'the corpus spelling is wrap="wrap"; the boolean resolves too',
    },
    height: { forms: ["length"], sample: "100%", corpus: ["L16-M3"] },
  },

  col: {
    align: { forms: ["enum"], values: ALIGN, sample: "center", corpus: ["L08-M18"] },
    gap: { forms: ["scale", "length"], sample: 2, corpus: ["L08-M18"] },
    justify: {
      forms: ["enum"],
      values: JUSTIFY,
      sample: "center",
      inferred: true,
      note: "row symmetry — the same flex container on the other axis",
    },
    wrap: {
      forms: ["boolean", "enum"],
      values: ["wrap"],
      sample: true,
      inferred: true,
      note: "row symmetry",
    },
    height: { forms: ["length"], sample: "100%", inferred: true, note: "row symmetry" },
  },

  grid: {
    columns: {
      forms: ["number"],
      sample: 3,
      corpus: ["L01-M69", "L04-M46"],
      note: 'clamped to 1–12; "auto" gives a responsive fit',
    },
    gap: {
      forms: ["scale", "length"],
      sample: 2,
      corpus: ["L01-M69", "L04-M46"],
      note: "also accepts literal lengths",
    },
  },

  "grid-item": {},

  list: {
    gap: {
      forms: ["scale"],
      sample: 2,
      corpus: ["L05-M29"],
      note: "clamped to the 0–8 scale; list items keep display: list-item",
    },
    connector: {
      forms: ["enum"],
      values: ["solid"],
      sample: "solid",
      corpus: ["L05-M29"],
      note: "draws a rule through the item markers (a step/flow timeline)",
    },
  },

  divider: {
    spacing: { forms: ["scale"], sample: 2, corpus: ["L08-M18"] },
    color: {
      forms: ["enum", "color"],
      values: ["subtle"],
      sample: "subtle",
      corpus: ["L01-M30"],
      note: "the captured spelling of a muted rule; literal colours also resolve",
    },
  },

  "table-cell": {
    textAlign: {
      forms: ["enum"],
      values: TEXT_ALIGN,
      sample: "center",
      lowered: true,
      note: "arrives from Markdown column alignment (`:---:`), the same attribute `text` uses",
    },
  },

  text: {
    size: {
      forms: ["enum", "length"],
      values: TEXT_SIZE,
      sample: "sm",
      corpus: ["L01-M30", "L04-M46"],
      note: "literal lengths resolve to inline font-size",
    },
    weight: { forms: ["enum"], values: WEIGHT, sample: "medium", corpus: ["L01-M30"] },
    color: { forms: ["enum", "color"], values: FOREGROUND, sample: "secondary", corpus: ["L01-M30", "L08-M5"] },
    textAlign: { forms: ["enum"], values: TEXT_ALIGN, sample: "center", corpus: ["L01-M69"] },
    tabularNums: { forms: ["boolean"], sample: true, corpus: ["L01-M30"] },
    lineThrough: { forms: ["boolean"], sample: true, corpus: ["L06-M14"] },
  },

  title: {
    size: {
      forms: ["enum", "length"],
      values: TEXT_SIZE,
      sample: "lg",
      corpus: ["L01-M7", "L01-M46", "L01-M69"],
      note: "literal lengths resolve to inline font-size",
    },
    color: { forms: ["enum", "color"], values: FOREGROUND, sample: "default", corpus: ["L16-M3"] },
  },

  caption: {
    textAlign: { forms: ["enum"], values: TEXT_ALIGN, sample: "center", corpus: ["L14-M14"] },
  },

  badge: {
    color: {
      forms: ["enum", "color"],
      values: FOREGROUND,
      sample: "success",
      corpus: ["L01-M30", "L04-M52", "L06-M14"],
      note: "badge is preconfigured: xs size, pill shape, muted fill — only `color` is styleable",
    },
  },

  icon: {
    size: { forms: ["enum"], values: ICON_SIZE, sample: "lg", corpus: ["L01-M30", "L02-M61"] },
    color: { forms: ["enum", "color"], values: FOREGROUND, sample: "success", corpus: ["L01-M30"] },
  },
};
