# DIL 组件与属性观测表

采样日期：2026-10-13（Asia/Shanghai）。来自 20 个近期对话 API 响应及一个历史附件。

这里统计的是 JavaScript AST 中实际的 `__dil.jsx` 调用点。循环体只计一个调用点；条件分支的调用即使未在屏幕显示，也会计入。按消息 ID 与完整 DIL 对象去重，共 67 个样本。出现过的属性值不等于完整枚举，也不保证在所有上下文中都有效。匿名函数和 Fragment 不列入组件总数。

## 布局

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `box` | 197 | `background`, `width`, `height`, `radius`, `clip`, `gap`, `key`, `padding`, `flex`, `border`, `align`, `minHeight`, `justify`, `size` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L02-M36](../../dil/L02-M36.formatted.js) |
| `row` | 93 | `justify`, `align`, `gap`, `wrap`, `height` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L02-M36](../../dil/L02-M36.formatted.js) |
| `col` | 2 | `align`, `gap` | [L08-M18](../../dil/L08-M18.formatted.js) |
| `grid` | 12 | `columns`, `gap` | [L01-M69](../../dil/L01-M69.formatted.js), [L04-M46](../../dil/L04-M46.formatted.js), [L05-M10](../../dil/L05-M10.formatted.js) |
| `grid-item` | 21 | `key` | [L01-M69](../../dil/L01-M69.formatted.js), [L04-M46](../../dil/L04-M46.formatted.js), [L05-M10](../../dil/L05-M10.formatted.js) |

## 文本与展示

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `text` | 2301 | `color`, `weight`, `size`, `tabularNums`, `textAlign`, `key`, `lineThrough`, `x`, `y`, `fontSize`, `textAnchor`, `fill`, `fontWeight` | [L01-M1](../../dil/L01-M1.formatted.js), [L01-M7](../../dil/L01-M7.formatted.js), [L01-M15](../../dil/L01-M15.formatted.js) |
| `title` | 169 | `size`, `color` | [L01-M7](../../dil/L01-M7.formatted.js), [L01-M30](../../dil/L01-M30.formatted.js), [L01-M46](../../dil/L01-M46.formatted.js) |
| `bold` | 471 | 无 | [L01-M7](../../dil/L01-M7.formatted.js), [L01-M30](../../dil/L01-M30.formatted.js), [L01-M32](../../dil/L01-M32.formatted.js) |
| `italic` | 2 | 无 | [L04-M52](../../dil/L04-M52.formatted.js), [L05-M39](../../dil/L05-M39.formatted.js) |
| `code` | 492 | 无 | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L01-M113](../../dil/L01-M113.formatted.js) |
| `caption` | 26 | `textAlign` | [L01-M30](../../dil/L01-M30.formatted.js), [L02-M71](../../dil/L02-M71.formatted.js), [L04-M46](../../dil/L04-M46.formatted.js) |
| `blockquote` | 15 | 无 | [L02-M71](../../dil/L02-M71.formatted.js), [L04-M52](../../dil/L04-M52.formatted.js), [L05-M10](../../dil/L05-M10.formatted.js) |
| `math` | 84 | `key`, `value`, `block` | [L01-M113](../../dil/L01-M113.formatted.js), [L04-M12](../../dil/L04-M12.formatted.js), [L04-M24](../../dil/L04-M24.formatted.js) |
| `icon` | 114 | `name`, `size`, `color`, `inline` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L02-M36](../../dil/L02-M36.formatted.js) |
| `badge` | 12 | `color` | [L01-M30](../../dil/L01-M30.formatted.js), [L04-M52](../../dil/L04-M52.formatted.js), [L05-M26](../../dil/L05-M26.formatted.js) |
| `divider` | 29 | `color`, `spacing` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L02-M61](../../dil/L02-M61.formatted.js) |

## 列表与表格

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `list` | 75 | `marker`, `connector`, `gap` | [L01-M7](../../dil/L01-M7.formatted.js), [L01-M30](../../dil/L01-M30.formatted.js), [L01-M46](../../dil/L01-M46.formatted.js) |
| `list-item` | 247 | 无 | [L01-M7](../../dil/L01-M7.formatted.js), [L01-M30](../../dil/L01-M30.formatted.js), [L01-M46](../../dil/L01-M46.formatted.js) |
| `table` | 42 | 无 | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L01-M113](../../dil/L01-M113.formatted.js) |
| `table-row` | 254 | 无 | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L01-M113](../../dil/L01-M113.formatted.js) |
| `table-cell` | 652 | `header` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L01-M113](../../dil/L01-M113.formatted.js) |

## 交互

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `button` | 4 | `block`, `onClick`, `color`, `size` | [L08-M5](../../dil/L08-M5.formatted.js), [L12-M24](../../dil/L12-M24.formatted.js), [L15-M10](../../dil/L15-M10.formatted.js) |
| `radio-group` | 2 | `direction`, `value`, `onChange` | [L08-M5](../../dil/L08-M5.formatted.js), [L12-M24](../../dil/L12-M24.formatted.js) |
| `radio` | 8 | `value` | [L08-M5](../../dil/L08-M5.formatted.js), [L12-M24](../../dil/L12-M24.formatted.js) |
| `label` | 1 | 无 | [L12-M24](../../dil/L12-M24.formatted.js) |
| `textarea` | 1 | `rows`, `value`, `onChange`, `placeholder` | [L12-M24](../../dil/L12-M24.formatted.js) |

## SVG 节点

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `svg` | 3 | `viewBox`, `width`, `xmlns` | [L14-M8](../../dil/L14-M8.formatted.js), [L14-M14](../../dil/L14-M14.formatted.js) |
| `defs` | 1 | 无 | [L14-M8](../../dil/L14-M8.formatted.js) |
| `marker` | 1 | `id`, `markerWidth`, `markerHeight`, `refX`, `refY`, `orient` | [L14-M8](../../dil/L14-M8.formatted.js) |
| `rect` | 14 | `x`, `y`, `width`, `height`, `rx`, `fill`, `fillOpacity`, `stroke`, `strokeWidth` | [L14-M8](../../dil/L14-M8.formatted.js), [L14-M14](../../dil/L14-M14.formatted.js) |
| `path` | 6 | `d`, `stroke`, `strokeWidth`, `markerEnd`, `fill`, `strokeDasharray` | [L14-M8](../../dil/L14-M8.formatted.js), [L14-M14](../../dil/L14-M14.formatted.js) |

## 宿主解析组件

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `Cite` | 117 | `refs`, `__resolutionId`, `ref` | [L01-M7](../../dil/L01-M7.formatted.js), [L01-M30](../../dil/L01-M30.formatted.js), [L01-M46](../../dil/L01-M46.formatted.js) |
| `Link` | 27 | `url`, `title`, `__resolutionId`, `ref` | [L01-M30](../../dil/L01-M30.formatted.js), [L01-M69](../../dil/L01-M69.formatted.js), [L04-M46](../../dil/L04-M46.formatted.js) |
| `Entity` | 6 | `category`, `value`, `disambig`, `__resolutionId` | [L04-M24](../../dil/L04-M24.formatted.js), [L04-M46](../../dil/L04-M46.formatted.js), [L04-M49](../../dil/L04-M49.formatted.js) |
| `AsyncImage` | 4 | `query`, `aspectRatio`, `__resolutionId`, `maxWidth` | [L07-M4](../../dil/L07-M4.formatted.js), [L12-M12](../../dil/L12-M12.formatted.js) |
| `AsyncImageGroup` | 2 | `query`, `aspectRatio`, `layout`, `__resolutionId` | [L14-M14](../../dil/L14-M14.formatted.js) |

## 内部占位节点

| 名称 | 调用点 | 实际出现的属性 | 示例来源 |
|---|---:|---|---|
| `__chatgptClientDefinedWidget` | 83 | `key`, `invocationId` | [L01-M113](../../dil/L01-M113.formatted.js), [L04-M12](../../dil/L04-M12.formatted.js), [L04-M24](../../dil/L04-M24.formatted.js) |

## 布局：属性值与表达式

### `box`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `background` | <code>&quot;surface-tertiary&quot;; &quot;surface-secondary&quot;; &quot;rgba(40,128,200,0.07)&quot;; &quot;surface&quot;; &quot;rgba(34,139,94,0.85)&quot;; &quot;rgba(35,131,226,0.07)&quot;; &quot;rgba(22,163,74,0.07)&quot;; &quot;rgba(35,131,226,0.15)&quot;; &quot;rgba(22,163,74,0.15)&quot;; &quot;rgba(32,140,90,0.08)&quot;; &quot;#2878D0&quot;; &quot;#85B7ED&quot;; &quot;rgba(33,130,210,0.07)&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `width` | <code>&quot;100%&quot;; &quot;90%&quot;; &quot;50%&quot;; &quot;80%&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `height` | <code>&quot;100%&quot;; &quot;11px&quot;; &quot;8px&quot;; &quot;12px&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `radius` | <code>&quot;full&quot;; &quot;lg&quot;; &quot;sm&quot;; &quot;xl&quot;; &quot;md&quot;; &quot;xs&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `clip` | <code>true</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `gap` | <code>&quot;5px&quot;; 3; 1; 2; &quot;1px&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `key` | <code>m.name; item</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `padding` | <code>3; {&quot;x&quot;:2,&quot;y&quot;:1}; 2; {&quot;left&quot;:4}; 1; {&quot;x&quot;:4,&quot;y&quot;:2}; {&quot;x&quot;:3,&quot;y&quot;:2}; {&quot;left&quot;:2}</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `flex` | <code>&quot;1&quot;; 1; 2; 0.5</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `border` | <code>true; {&quot;size&quot;:1,&quot;color&quot;:&quot;rgba(40,128,200,0.25)&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;default&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;default&quot;,&quot;style&quot;:&quot;dashed&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;info&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;success&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;rgba(32,140,90,0.35)&quot;}; {&quot;size&quot;:1,&quot;color&quot;:&quot;rgba(33,130,210,0.25)&quot;}</code> | [L01-M69](../../dil/L01-M69.formatted.js) |
| `align` | <code>&quot;center&quot;</code> | [L01-M69](../../dil/L01-M69.formatted.js) |
| `minHeight` | <code>&quot;76px&quot;</code> | [L05-M29](../../dil/L05-M29.formatted.js) |
| `justify` | <code>&quot;center&quot;</code> | [L05-M29](../../dil/L05-M29.formatted.js) |
| `size` | <code>&quot;12px&quot;</code> | [L08-M18](../../dil/L08-M18.formatted.js) |

### `row`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `justify` | <code>&quot;between&quot;; &quot;center&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `align` | <code>&quot;center&quot;; &quot;start&quot;; &quot;baseline&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `gap` | <code>3; 2; 1; &quot;0&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `wrap` | <code>&quot;wrap&quot;</code> | [L01-M69](../../dil/L01-M69.formatted.js) |
| `height` | <code>&quot;100%&quot;</code> | [L16-M3](../../dil/L16-M3.formatted.js) |

### `col`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `align` | <code>&quot;center&quot;</code> | [L08-M18](../../dil/L08-M18.formatted.js) |
| `gap` | <code>2</code> | [L08-M18](../../dil/L08-M18.formatted.js) |

### `grid`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `columns` | <code>3; 2</code> | [L01-M69](../../dil/L01-M69.formatted.js) |
| `gap` | <code>2; 1; 3</code> | [L01-M69](../../dil/L01-M69.formatted.js) |

### `grid-item`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `key` | <code>name</code> | [L05-M29](../../dil/L05-M29.formatted.js) |

## 文本与展示：属性值与表达式

### `text`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `color` | <code>&quot;secondary&quot;; &quot;success&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `weight` | <code>&quot;medium&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `size` | <code>&quot;xs&quot;; &quot;sm&quot;; &quot;2xs&quot;; &quot;3xs&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `tabularNums` | <code>true</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `textAlign` | <code>&quot;center&quot;</code> | [L01-M69](../../dil/L01-M69.formatted.js) |
| `key` | <code>&quot;cdw:0&quot;; &quot;cdw:1&quot;</code> | [L01-M113](../../dil/L01-M113.formatted.js) |
| `lineThrough` | <code>true</code> | [L06-M14](../../dil/L06-M14.formatted.js) |
| `x` | <code>&quot;170&quot;; &quot;116&quot;; &quot;223&quot;; &quot;55&quot;; &quot;285&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `y` | <code>&quot;26&quot;; &quot;78&quot;; &quot;151&quot;; &quot;166&quot;; &quot;92&quot;; &quot;127&quot;; &quot;143&quot;; &quot;179&quot;; &quot;30&quot;; &quot;54&quot;; &quot;65&quot;; &quot;97&quot;; &quot;108&quot;; &quot;189&quot;; &quot;206&quot;; &quot;222&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fontSize` | <code>&quot;11&quot;; &quot;12&quot;; &quot;10&quot;; &quot;9&quot;; &quot;13&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `textAnchor` | <code>&quot;middle&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fill` | <code>&quot;currentColor&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fontWeight` | <code>&quot;600&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |

### `title`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `size` | <code>&quot;lg&quot;; &quot;xl&quot;; &quot;md&quot;; &quot;2xl&quot;</code> | [L01-M7](../../dil/L01-M7.formatted.js) |
| `color` | <code>&quot;default&quot;</code> | [L16-M3](../../dil/L16-M3.formatted.js) |

### `bold`

样本调用没有属性对象，或属性为 `null`。

### `italic`

样本调用没有属性对象，或属性为 `null`。

### `code`

样本调用没有属性对象，或属性为 `null`。

### `caption`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `textAlign` | <code>&quot;center&quot;</code> | [L14-M14](../../dil/L14-M14.formatted.js) |

### `blockquote`

样本调用没有属性对象，或属性为 `null`。

### `math`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `key` | <code>&quot;cdw:0&quot;; &quot;cdw:1&quot;</code> | [L01-M113](../../dil/L01-M113.formatted.js) |
| `value` | <code>__dilConstants[&quot;6&quot;].value; __dilConstants[&quot;10&quot;].value</code> | [L01-M113](../../dil/L01-M113.formatted.js) |
| `block` | <code>true</code> | [L08-M5](../../dil/L08-M5.formatted.js) |

### `icon`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `name` | <code>&quot;github&quot;; &quot;thumbs-up&quot;; &quot;thumbs-down&quot;; &quot;code-2&quot;; &quot;layout-grid&quot;; &quot;image&quot;; &quot;sliders-horizontal&quot;; &quot;arrow-down&quot;; &quot;check-circle-2&quot;; &quot;circle-help&quot;; &quot;search&quot;; &quot;link&quot;; &quot;check-circle&quot;; &quot;x-circle&quot;; &quot;network&quot;; &quot;shield-check&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `size` | <code>&quot;xl&quot;; &quot;lg&quot;; &quot;2xl&quot;; &quot;sm&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `color` | <code>&quot;success&quot;; &quot;danger&quot;; &quot;secondary&quot;; &quot;tertiary&quot;; &quot;default&quot;; &quot;info&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `inline` | <code>true</code> | [L12-M24](../../dil/L12-M24.formatted.js) |

### `badge`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `color` | <code>&quot;success&quot;; &quot;secondary&quot;; &quot;info&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |

### `divider`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `color` | <code>&quot;subtle&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `spacing` | <code>2</code> | [L08-M18](../../dil/L08-M18.formatted.js) |

## 列表与表格：属性值与表达式

### `list`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `marker` | <code>&quot;number&quot;; &quot;bullet&quot;</code> | [L01-M7](../../dil/L01-M7.formatted.js) |
| `connector` | <code>&quot;solid&quot;</code> | [L05-M29](../../dil/L05-M29.formatted.js) |
| `gap` | <code>2</code> | [L05-M29](../../dil/L05-M29.formatted.js) |

### `list-item`

样本调用没有属性对象，或属性为 `null`。

### `table`

样本调用没有属性对象，或属性为 `null`。

### `table-row`

样本调用没有属性对象，或属性为 `null`。

### `table-cell`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `header` | <code>true</code> | [L01-M30](../../dil/L01-M30.formatted.js) |

## 交互：属性值与表达式

### `button`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `block` | <code>true</code> | [L08-M5](../../dil/L08-M5.formatted.js) |
| `onClick` | <code>()=&gt;setRevealed(true); ()=&gt;GenUI.openUrl(&quot;https://webdevicetest.com/en/tools/midi-input-test&quot;)</code> | [L08-M5](../../dil/L08-M5.formatted.js) |
| `color` | <code>&quot;primary&quot;</code> | [L15-M10](../../dil/L15-M10.formatted.js) |
| `size` | <code>&quot;md&quot;</code> | [L15-M10](../../dil/L15-M10.formatted.js) |

### `radio-group`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `direction` | <code>&quot;col&quot;</code> | [L08-M5](../../dil/L08-M5.formatted.js) |
| `value` | <code>choice; result</code> | [L08-M5](../../dil/L08-M5.formatted.js) |
| `onChange` | <code>v=&gt;{setChoice(v);setRevealed(false)}; setResult</code> | [L08-M5](../../dil/L08-M5.formatted.js) |

### `radio`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `value` | <code>&quot;A&quot;; &quot;B&quot;</code> | [L08-M5](../../dil/L08-M5.formatted.js) |

### `label`

样本调用没有属性对象，或属性为 `null`。

### `textarea`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `rows` | <code>2</code> | [L12-M24](../../dil/L12-M24.formatted.js) |
| `value` | <code>details</code> | [L12-M24](../../dil/L12-M24.formatted.js) |
| `onChange` | <code>setDetails</code> | [L12-M24](../../dil/L12-M24.formatted.js) |
| `placeholder` | <code>&quot;例如：设备列表显示 USB MIDI，但按键无反应……&quot;</code> | [L12-M24](../../dil/L12-M24.formatted.js) |

## SVG 节点：属性值与表达式

### `svg`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `viewBox` | <code>&quot;0 0 340 188&quot;; &quot;0 0 340 198&quot;; &quot;0 0 340 272&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `width` | <code>&quot;100%&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `xmlns` | <code>&quot;http://www.w3.org/2000/svg&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |

### `defs`

样本调用没有属性对象，或属性为 `null`。

### `marker`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `id` | <code>&quot;arrow1&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `markerWidth` | <code>&quot;6&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `markerHeight` | <code>&quot;6&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `refX` | <code>&quot;5&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `refY` | <code>&quot;3&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `orient` | <code>&quot;auto&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |

### `rect`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `x` | <code>&quot;79&quot;; &quot;52&quot;; &quot;67&quot;; &quot;175&quot;; &quot;18&quot;; &quot;133&quot;; &quot;248&quot;; &quot;49&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `y` | <code>&quot;8&quot;; &quot;57&quot;; &quot;132&quot;; &quot;72&quot;; &quot;104&quot;; &quot;11&quot;; &quot;41&quot;; &quot;83&quot;; &quot;168&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `width` | <code>&quot;80&quot;; &quot;182&quot;; &quot;236&quot;; &quot;99&quot;; &quot;97&quot;; &quot;94&quot;; &quot;74&quot;; &quot;242&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `height` | <code>&quot;28&quot;; &quot;34&quot;; &quot;45&quot;; &quot;116&quot;; &quot;62&quot;; &quot;120&quot;; &quot;33&quot;; &quot;91&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `rx` | <code>&quot;8&quot;; &quot;7&quot;; &quot;9&quot;; &quot;12&quot;; &quot;10&quot;; &quot;6&quot;; &quot;11&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fill` | <code>&quot;#64748b&quot;; &quot;#0d9488&quot;; &quot;#2563eb&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fillOpacity` | <code>&quot;.15&quot;; &quot;.12&quot;; &quot;.13&quot;; &quot;.07&quot;; &quot;.16&quot;; &quot;.08&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `stroke` | <code>&quot;#94a3b8&quot;; &quot;#64748b&quot;; &quot;#0d9488&quot;; &quot;#3b82f6&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `strokeWidth` | <code>&quot;1.5&quot;; &quot;1.8&quot;; &quot;1.6&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |

### `path`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `d` | <code>`M${54+i*116} 36 V54`; `M${54+i*116} 91 V111 L170 131`</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `stroke` | <code>&quot;#94a3b8&quot;; &quot;#0d9488&quot;; &quot;#64748b&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `strokeWidth` | <code>&quot;1.5&quot;; &quot;1.4&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `markerEnd` | <code>&quot;url(#arrow1)&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `fill` | <code>&quot;none&quot;; &quot;#94a3b8&quot;</code> | [L14-M8](../../dil/L14-M8.formatted.js) |
| `strokeDasharray` | <code>&quot;4 3&quot;</code> | [L14-M14](../../dil/L14-M14.formatted.js) |

## 宿主解析组件：属性值与表达式

### `Cite`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `refs` | <code>__dilConstants[&quot;11&quot;]; __dilConstants[&quot;10&quot;]</code> | [L01-M7](../../dil/L01-M7.formatted.js) |
| `__resolutionId` | <code>__dilConstants[&quot;12&quot;]; __dilConstants[&quot;16&quot;]</code> | [L01-M7](../../dil/L01-M7.formatted.js) |
| `ref` | <code>&quot;turn125988search1&quot;; &quot;turn296041view4&quot;</code> | [L01-M7](../../dil/L01-M7.formatted.js) |

### `Link`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `url` | <code>&quot;https://www.openui.com/benchmarks&quot;; &quot;https://github.com/peteallport/Astra-Browser-MacOS&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `title` | <code>&quot;Generative UI Benchmark&quot;; &quot;AstraBrowse – GitHub&quot;; &quot;Reddit 原帖与评论&quot;; &quot;交互式细胞解释示例&quot;; &quot;传统文本版本&quot;; &quot;Gan-Tu / Widgets&quot;; &quot;OpenAI 官方发布说明&quot;; &quot;WIRED 的实际体验&quot;; &quot;Anthropic Messages API Reference&quot;; &quot;Using the Messages API&quot;; &quot;How Tool Use Works&quot;; &quot;Streaming Messages&quot;; &quot;OpenAI: Migrate to Responses API&quot;; &quot;Anthropic Prompt Caching&quot;; &quot;Devin 官方计费文档&quot;; &quot;Devin 官方计费说明&quot;</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `__resolutionId` | <code>__dilConstants[&quot;3&quot;]; __dilConstants[&quot;21&quot;]</code> | [L01-M30](../../dil/L01-M30.formatted.js) |
| `ref` | <code>&quot;turn373549view0&quot;; &quot;turn190489search0&quot;</code> | [L10-M19](../../dil/L10-M19.formatted.js) |

### `Entity`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `category` | <code>&quot;software&quot;; &quot;people&quot;; &quot;product&quot;</code> | [L04-M24](../../dil/L04-M24.formatted.js) |
| `value` | <code>__dilConstants[&quot;3&quot;]; __dilConstants[&quot;14&quot;]</code> | [L04-M24](../../dil/L04-M24.formatted.js) |
| `disambig` | <code>&quot;函数式编程语言&quot;; &quot;OCaml 编程语言设计者&quot;; &quot;静态类型的 JavaScript 编程语言&quot;; &quot;特伦斯 88键折叠电钢琴&quot;; &quot;开源自托管分布式 Durable Objects 运行时&quot;; &quot;微软 .NET Virtual Actor 分布式框架&quot;</code> | [L04-M24](../../dil/L04-M24.formatted.js) |
| `__resolutionId` | <code>__dilConstants[&quot;4&quot;]; __dilConstants[&quot;15&quot;]</code> | [L04-M24](../../dil/L04-M24.formatted.js) |

### `AsyncImage`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `query` | <code>&quot;wave function collapse algorithm tile constraints simple pixel art tiles example&quot;; &quot;wave function collapse procedural generation isometric terrain low poly floating island tiles game environment&quot;</code> | [L07-M4](../../dil/L07-M4.formatted.js) |
| `aspectRatio` | <code>&quot;5:4&quot;; &quot;1:1&quot;</code> | [L07-M4](../../dil/L07-M4.formatted.js) |
| `__resolutionId` | <code>__dilConstants[&quot;18&quot;]; __dilConstants[&quot;20&quot;]</code> | [L07-M4](../../dil/L07-M4.formatted.js) |
| `maxWidth` | <code>&quot;132px&quot;</code> | [L12-M12](../../dil/L12-M12.formatted.js) |

### `AsyncImageGroup`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `query` | <code>__dilConstants[&quot;203&quot;]; __dilConstants[&quot;222&quot;]</code> | [L14-M14](../../dil/L14-M14.formatted.js) |
| `aspectRatio` | <code>&quot;5:3&quot;</code> | [L14-M14](../../dil/L14-M14.formatted.js) |
| `layout` | <code>&quot;carousel&quot;</code> | [L14-M14](../../dil/L14-M14.formatted.js) |
| `__resolutionId` | <code>__dilConstants[&quot;204&quot;]; __dilConstants[&quot;223&quot;]</code> | [L14-M14](../../dil/L14-M14.formatted.js) |

## 内部占位节点：属性值与表达式

### `__chatgptClientDefinedWidget`

| 属性 | 值或表达式实例 | 来源 |
|---|---|---|
| `key` | <code>&quot;cdw:0&quot;; &quot;cdw:1&quot;</code> | [L01-M113](../../dil/L01-M113.formatted.js) |
| `invocationId` | <code>__dilConstants[&quot;5&quot;]; __dilConstants[&quot;9&quot;]</code> | [L01-M113](../../dil/L01-M113.formatted.js) |

## 计数解释

`text` 同时出现在普通文本、Markdown 转换结果和 SVG 中。`math`/`text` 有些调用来自客户端占位组件的条件回退，不能把调用点总数当成用户实际看见的数学公式数量。`Cite` 有 117 个调用点，而 `componentResults` 中有 116 个对应解析结果；这两个对象表达不同层次的数据，不能强行要求计数一致。全部原始属性值、表达式 AST 类型和来源在 [components.json](../../analysis/components.json)。
