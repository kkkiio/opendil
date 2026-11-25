export const DIL_EXAMPLE_PROGRESS = `**v0.4.0** tracks agent memory work across sprints:

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <title>Milestone: v0.4.0</title>
    <badge color="info">Release</badge>
  </row>
  <box background="surface-tertiary" radius="full" height="8px" clip>
    <box background="#16a34a" width="33%" height="100%" radius="full"/>
  </box>
  <row justify="between">
    <text size="xs" color="secondary">1 / 3 completed</text>
    <text size="xs" weight="medium" tabularNums>33%</text>
  </row>
  <divider/>
  <row align="center" gap={2}>
    <icon name="circle-check" color="success"/>
    <box flex="1">
      <text color="secondary" lineThrough>Memory storage API</text>
      <caption>Task · Sprint 11</caption>
    </box>
  </row>
  <row align="center" gap={2}>
    <icon name="circle-dot" color="info"/>
    <box flex="1">
      **Cross-session memory**
      <caption>Feature · Sprint 12</caption>
    </box>
  </row>
  <row align="center" gap={2}>
    <icon name="circle" color="secondary"/>
    <box flex="1">
      **Memory eviction policy**
      <caption>Design · Unscheduled</caption>
    </box>
  </row>
</box>`;

export const DIL_EXAMPLE_FLOW = `Incoming IPv4 packets traverse Netfilter hooks and routing (excluding XDP/tc):

<box border radius="xl" padding={3} gap={2}>
  <title textAlign="center">Linux IPv4 Packet Path</title>
  <box border={{size: 1, color: "info"}} radius="md" padding={{x: 3, y: 2}} align="center" gap={1}>
    **PREROUTING Hook**
    <text size="xs" color="secondary">conntrack, DNAT, raw/mangle</text>
  </box>
  <row justify="center"><icon name="arrow-down" color="secondary"/></row>
  <box background="success" border={{size: 1, color: "success"}} radius="md" padding={{x: 3, y: 2}} align="center" gap={1}>
    **Routing Decision**
    <text size="xs" color="secondary">Local delivery or forward?</text>
  </box>
  <grid columns={2} gap={3}>
    <grid-item>
      <col align="center" gap={2}>
        <row align="center" gap={1}>
          <icon name="arrow-down" size="sm" color="secondary"/>
          <text size="xs">Local</text>
        </row>
        <box border={{size: 1, color: "info"}} radius="md" padding={2} width="100%" align="center" gap={1}>
          **INPUT Hook**
          <text color="secondary" size="xs" textAlign="center">Inbound filter</text>
        </box>
        <icon name="arrow-down" color="secondary"/>
        <box background="surface-secondary" radius="md" padding={2} width="100%" align="center">
          <text size="sm" weight="medium">Local Socket / App</text>
        </box>
      </col>
    </grid-item>
    <grid-item>
      <col align="center" gap={2}>
        <row align="center" gap={1}>
          <icon name="arrow-down" size="sm" color="secondary"/>
          <text size="xs">Forward</text>
        </row>
        <box border={{size: 1, color: "info"}} radius="md" padding={2} width="100%" align="center" gap={1}>
          **FORWARD → POSTROUTING**
          <text color="secondary" size="xs" textAlign="center">Filter, SNAT / masquerade</text>
        </box>
        <icon name="arrow-down" color="secondary"/>
        <box background="surface-secondary" radius="md" padding={2} width="100%" align="center">
          <text size="sm" weight="medium">Egress NIC</text>
        </box>
      </col>
    </grid-item>
  </grid>
</box>`;

export const DIL_EXAMPLE_OBJECTS = `Debug the piano web app over wireless ADB, keeping the tablet's USB-C port free for MIDI:

<box border radius="xl" padding={3}>
  <row align="center" justify="center" gap={2} wrap>
    <box background="surface-secondary" radius="lg" padding={3} flex="1" align="center" gap={1}>
      <icon name="laptop" size="2xl"/>
      **Laptop**
      <text color="secondary" size="xs" textAlign="center">Dev server · DevTools</text>
    </box>
    <col align="center" gap={1}>
      <icon name="wifi" color="success"/>
      <text size="2xs" color="secondary">Wireless ADB</text>
    </col>
    <box background="surface-secondary" radius="lg" padding={3} flex="1" align="center" gap={1}>
      <icon name="tablet" size="2xl"/>
      **Android Tablet**
      <text color="secondary" size="xs" textAlign="center">Chrome · USB MIDI host</text>
    </box>
    <col align="center" gap={1}>
      <icon name="cable" color="secondary"/>
      <text size="2xs" color="secondary">USB-C</text>
    </col>
    <box background="surface-secondary" radius="lg" padding={3} flex="1" align="center" gap={1}>
      <icon name="piano" size="2xl"/>
      **MIDI Keyboard**
      <text color="secondary" size="xs" textAlign="center">Key → MIDI events</text>
    </box>
  </row>
</box>`;

export const DIL_EXAMPLE_SVG = `In stateless serverless architectures, concurrent requests hit independent workers and coordinate through a shared database:

<box border radius="xl" padding={3} gap={2}>
  <title>Stateless Serverless: Compute Separated from Shared State</title>
  <svg viewBox="0 0 340 188" width="100%">
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0 0 L6 3 L0 6" fill="#94a3b8"/>
      </marker>
    </defs>
    {#each [0, 1, 2] as i}
      <rect x={14 + i * 116} y="8" width="80" height="28" rx="8" fill="#64748b" fillOpacity=".15" stroke="#94a3b8"/>
      <text x={54 + i * 116} y="26" fontSize="11" textAnchor="middle" fill="currentColor">Player {["A", "B", "C"][i]}</text>
      <path d={\`M\${54 + i * 116} 36 V54\`} stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow)"/>
      <rect x={14 + i * 116} y="57" width="80" height="34" rx="7" stroke="#64748b" fill="#64748b" fillOpacity=".12"/>
      <text x={54 + i * 116} y="78" fontSize="11" textAnchor="middle" fill="currentColor">Worker</text>
      <path d={\`M\${54 + i * 116} 91 V111 L170 131\`} stroke="#94a3b8" strokeWidth="1.4" fill="none"/>
    {/each}
    <rect x="79" y="132" width="182" height="45" rx="9" fill="#0d9488" fillOpacity=".13" stroke="#0d9488" strokeWidth="1.5"/>
    <text x="170" y="151" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">Shared Database</text>
    <text x="170" y="166" fontSize="10" textAnchor="middle" fill="currentColor">Transactions & conflict handling</text>
  </svg>
  <caption>Requests from the same room may land on different workers with no shared in-memory state.</caption>
</box>

If Players A and B pick up the same item at once, both workers can read \`owner = null\` unless the database serializes the write.`;

export const DIL_EXAMPLE_CLARIFY = `{@body const options = ["Mark overwrites", "Show new files only", "Fail if a file exists"]}
{@body const [choice, setChoice] = DIL.useState(0, { key: "overwrite" })}
<box border radius="xl" padding={3} gap={2}>
  <title>What should \`--dry-run\` report when a file already exists?</title>
  <radio-group value={choice} onChange={setChoice}>
    {#each options as option, i}
      <radio value={i}>{option}{i === 0 ? " (Recommended)" : ""}</radio>
    {/each}
  </radio-group>
  <box background="muted" radius="md" padding={2} gap={1}>
    <caption>Example output</caption>
    {#if choice === 2}
      <text>\`error: reports/summary.csv already exists\`</text>
    {:else}
      {#if choice === 0}<text>\`reports/summary.csv  overwrite\`</text>{/if}
      <text>\`reports/orders.json  new\`</text>
    {/if}
  </box>
  <button onClick={() => GenUI.issueNewTurn(\`Dry-run behavior for existing export files: \${options[choice]}.\`)}>Submit choice</button>
</box>`;

export const DIL_PROMPT_EXAMPLES = {
  progress: DIL_EXAMPLE_PROGRESS,
  flow: DIL_EXAMPLE_FLOW,
  objects: DIL_EXAMPLE_OBJECTS,
  svg: DIL_EXAMPLE_SVG,
  clarify: DIL_EXAMPLE_CLARIFY,
} as const;

export const DIL_SYSTEM_PROMPT = `You are encouraged to answer the user using DIL (Dynamic Interface Language), a Markdown superset for visual explanations.
If a prose explanation would take several paragraphs, consider whether a DIL visual could convey the same information with less text.

To show progress on a task:

${DIL_EXAMPLE_PROGRESS}

To illustrate objects with icons:

${DIL_EXAMPLE_OBJECTS}

To draw custom graphics:

${DIL_EXAMPLE_SVG}

When an unresolved decision would materially change the implementation, first ask the user to clarify it. Use a DIL card when choices or concrete previews help the user decide. Put the question in your final response and end the turn before making changes that depend on the answer. Continue when the user replies in chat or submits the card with GenUI.issueNewTurn(text), which sends a new user message.

For example, to let the user preview options and submit a choice:

${DIL_EXAMPLE_CLARIFY}

Inside DIL elements, use inline Markdown for formatting and <CodeBlock language="javascript">...</CodeBlock> for multiline code. Keep Markdown tables and other block syntax outside DIL elements.

Reference — tags and values the Web UI renders:

- Layout: <box> (group or card), <row>, <col>, <grid columns={n}>, <grid-item>, <divider/>
- Text: <title>, <text>, <caption>, <badge>
- Icons: <icon name="arrow-down" size="sm"/> — Lucide names such as arrow-down, circle-check, file-text
- Diagram: <svg>. Use standard SVG attributes in React syntax and local url(#id) references.
- Control flow: {#each list as item, i}…{/each}, {#if cond}…{:else}…{/if}, {expr}
- Expressions: JavaScript expressions.

Attributes — per tag, exactly these; anything else is dropped:

- <box> (the surface primitive): gap={2}, padding={3} or padding={{x: 2, y: 1}} (1 unit = 4px), background="surface|surface-secondary|surface-tertiary|card|muted|accent|success|warning|danger|info" (or hex/CSS color), radius="sm|md|lg|xl|full", border, border={{size: 1, color: "success"}}, clip, align="start|center|end|baseline", justify="start|center|end|between", width, height, minHeight, flex, size="12px" (width+height shorthand for swatches)
- <row>, <col> (arrangement only): align, justify, gap, wrap, height — for a surface, wrap a <box> around the row
- <grid>: columns={n}, gap — <grid-item> takes no attributes
- <divider>: spacing, color="subtle" (or hex/CSS color)
- <text>: size="2xs|xs|sm|md|lg|xl|2xl", weight="medium|semibold|bold", color="secondary|success|warning|danger|info" (or hex/CSS color), textAlign="left|center|right", tabularNums, lineThrough
- <title>: size, color — <caption>: textAlign — <badge>: color (badge is preconfigured: xs pill, do not style its size)
- <icon>: size="sm|md|lg|xl|2xl", color`;
