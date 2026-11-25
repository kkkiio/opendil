# Inventory check

<box>
{@body const items = ["Cable", "Adapter"]}
{#each items as item, index}
<row gap={index + 1}>
  <badge>{index + 1}</badge>
  <text>{item}</text>
</row>
{/each}
</box>

| Item | Status |
| --- | --- |
| Cable | Ready |

<list marker="none">
  <list-item><icon name="check" inline/> Packed</list-item>
</list>
