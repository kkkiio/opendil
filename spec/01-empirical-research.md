# ChatGPT DIL / Intelligent UI：实际响应研究

研究日期：2026-10-13（Asia/Shanghai）
资料目录：`data/conversations/`（20 份会话响应）与 `dil/`（切分出的样本）

## 1. 核心发现

本次从用户已登录的 ChatGPT 网页检查最近 20 个对话，保存了 20 份成功返回的 Conversation API JSON，并重新解析此前上传的 `conversations-responses.json`。

**这批响应同时保留了两种可核验表示：`messages[i].content.parts` 中的 Markdown + 界面模板，以及同一消息 `metadata.model_dil_v2.code` 中的 JavaScript 渲染代码。** 因此，本次不仅能确认 `__dil.jsx()`，还能直接确认模板中的 `{#each}`、`{#if}`、`{@body ...}`，并比较它们与编译表示的对应关系。

| 发现 | 证据等级 | 具体证据 |
|---|---|---|
| JSX 风格标签、花括号属性、嵌套、自闭合元素 | 已观察 | L08-M5、L12-M24 等消息的 `content.parts` |
| `{#each expression as item}`、带索引 `as item,i` | 已观察，并有配对编译结果 | L06-M14 对应 `.map((item,i)=>...)` |
| `{#if revealed}...{/if}` | 已观察，并有配对编译结果 | L08-M5 对应受保护条件 + 三元表达式 |
| `{@body const [...] = DIL.useState(...)}` | 已观察 | L08-M5、L12-M24 |
| `DIL.useState`、`onChange`、`onClick` | 已观察 | 路由题、MIDI 反馈表单 |
| `GenUI.openUrl`、`GenUI.issueNewTurn` | 已观察到调用代码 | L12-M24；本次没有触发这两个动作 |
| `{:else}` / `{:else if}` | 未验证 | 在技术讲解文字中出现过名称，未找到实际模板控制块 |
| 完整语法、完整组件库、沙箱与编译器实现 | 未知 | 响应样本不足以证明 |

20 份实时响应中有 **64 个 DIL 消息样本**；历史附件另有 **11 个**。其中 8 个与实时样本重复，按消息 ID 和完整 DIL 对象去重后共 **67 个**。AST 中有 **32 个字符串调用目标 + 5 个宿主组件标识符**，另有匿名渲染函数和 `__dil.Fragment`。这 32 个字符串目标包括 26 个 UI 组件名、5 个 SVG 节点名和一个内部客户端占位名，不能统称为完整的官方组件库。

## 2. 采样范围与来源

### 获取方式

1. 通过 Browser Use / Computer Use 查看用户现有 Chrome ChatGPT 标签页与侧栏。
2. 在独立研究标签页中，通过页面侧栏逐个打开对话。
3. 使用浏览器提供的 CDP `Network.responseReceived` 和 `Network.getResponseBody` 读取由网页实际发出的响应，保存响应体；没有用自行拼接的认证请求替代网页流量。
4. 取得按更新时间排序的最近对话列表：

```text
GET https://chatgpt.com/backend-api/conversations
  ?exclude_conversation_origin=tpp
  &expand=false
  &hide_snorlax=false
  &is_archived=false
  &is_starred=false
  &limit=20
  &order=updated
  &offset=0
```

详情请求实际使用：

```text
GET https://chatgpt.com/backend-api/conversations/<conversation_id>
  ?num_turns=10
  &include_has_versions=true
```

这是浏览器产品端点的观测记录，不是公开 API 合约。所谓“最近 20 个”，指上述列表返回的 20 项；不包括侧栏夹在其中的 `/remote/task_...` 工作任务。列表中有自动化对话，它仍然是此次列表的一个对话项。排序列表返回 `limit=20, offset=0, total=21`，这里的 `total` 只保留为该次响应字段，不推断整个账号只有 21 个对话。

初始页面部分请求曾返回 403，原标签页的 CDP 响应导出也曾被 Browser Use 的暂停文档处理限制阻止。之后在独立标签页中通过普通页面导航取得全部 20 份 HTTP 200 响应。此次没有要求用户配置远程调试服务，也没有操作原生 DevTools 面板来复制 JSON；使用的是浏览器提供的同类 Network 数据接口。

### 20 个对话清单

以下消息数为响应 `messages` 数组长度，包含用户、助手与工具等消息；DIL 数为 `metadata.model_dil_v2` 对象数。API 使用十个近期 turn 的分页范围；“有更早页”表示这次响应不覆盖该对话全部历史。

| 编号 | 对话 | 消息数 | DIL | 有更早页 | 原响应 |
|---|---|---:|---:|---|---|
| L01 | [GPT六智能界面原理](https://chatgpt.com/c/6ac78944-07a0-83ec-977a-372cece4d84f) | 118 | 9 | 是 | [JSON](../../data/conversations/6ac78944-07a0-83ec-977a-372cece4d84f.json) |
| L02 | [解释程序工具](https://chatgpt.com/c/6acd0c12-5960-83ec-b678-b831421f4798) | 75 | 10 | 是 | [JSON](../../data/conversations/6acd0c12-5960-83ec-b678-b831421f4798.json) |
| L03 | [填写Tailscale设置](https://chatgpt.com/c/6a92c9af-fd40-83ea-89f1-12888f091a3a) | 33 | 0 | 是 | [JSON](../../data/conversations/6a92c9af-fd40-83ea-89f1-12888f091a3a.json) |
| L04 | [Moonbit机制疑问](https://chatgpt.com/c/6acce632-242c-83ec-a025-8ba46ab74b2c) | 53 | 8 | 否 | [JSON](../../data/conversations/6acce632-242c-83ec-a025-8ba46ab74b2c.json) |
| L05 | [介绍 Anthropic API](https://chatgpt.com/c/6accb8b4-cf8c-83ec-a256-2b3f1ad0e911) | 40 | 5 | 否 | [JSON](../../data/conversations/6accb8b4-cf8c-83ec-a256-2b3f1ad0e911.json) |
| L06 | [GitHub Issue 分类](https://chatgpt.com/c/6acca61d-8508-83ec-95e9-8c646f770f16) | 15 | 2 | 否 | [JSON](../../data/conversations/6acca61d-8508-83ec-95e9-8c646f770f16.json) |
| L07 | [解释WFC算法](https://chatgpt.com/c/6acca198-be1c-83ec-addd-4692850c32d2) | 5 | 1 | 否 | [JSON](../../data/conversations/6acca198-be1c-83ec-addd-4692850c32d2.json) |
| L08 | [学习IP路由寻址](https://chatgpt.com/c/6acc8714-f718-83ec-bdfb-3a34ecf00e3c) | 45 | 8 | 否 | [JSON](../../data/conversations/6acc8714-f718-83ec-bdfb-3a34ecf00e3c.json) |
| L09 | [微软蒸馏是否违法](https://chatgpt.com/c/6acc8670-6568-83ec-a396-dfbaf08268b9) | 12 | 2 | 否 | [JSON](../../data/conversations/6acc8670-6568-83ec-a396-dfbaf08268b9.json) |
| L10 | [额外扣费说明](https://chatgpt.com/c/6acc72cb-6594-83ec-9120-62a76eb80909) | 20 | 2 | 否 | [JSON](../../data/conversations/6acc72cb-6594-83ec-9120-62a76eb80909.json) |
| L11 | [美国油价与石油供需](https://chatgpt.com/c/6a72302c-e478-83ec-aa43-fd865a961d8c) | 42 | 0 | 是 | [JSON](../../data/conversations/6a72302c-e478-83ec-aa43-fd865a961d8c.json) |
| L12 | [分析MIDI教学方案](https://chatgpt.com/c/6ac70a5c-3030-83e9-870c-a621071758f3) | 92 | 6 | 是 | [JSON](../../data/conversations/6ac70a5c-3030-83e9-870c-a621071758f3.json) |
| L13 | [Strata推理引擎介绍](https://chatgpt.com/c/6abfa62e-ee78-83ec-bdfb-d4cc7e9a6d22) | 89 | 0 | 是 | [JSON](../../data/conversations/6abfa62e-ee78-83ec-bdfb-d4cc7e9a6d22.json) |
| L14 | [Durable Objects 介绍](https://chatgpt.com/c/6ac9f7c1-eed0-83ec-b4d3-4ee20ef0cbe9) | 36 | 7 | 否 | [JSON](../../data/conversations/6ac9f7c1-eed0-83ec-b4d3-4ee20ef0cbe9.json) |
| L15 | [A2UI使用JSON还是JSX](https://chatgpt.com/c/6ac9a340-8bc4-83ec-bceb-cf99b980f6a6) | 19 | 3 | 否 | [JSON](../../data/conversations/6ac9a340-8bc4-83ec-bceb-cf99b980f6a6.json) |
| L16 | [推迟上市利弊分析](https://chatgpt.com/c/6ac9a11d-0f00-83ec-b901-757959140538) | 4 | 1 | 否 | [JSON](../../data/conversations/6ac9a11d-0f00-83ec-b901-757959140538.json) |
| L17 | [动态工具加载机制](https://chatgpt.com/c/6ac8f2cd-5ce4-83ec-818b-2a1647207946) | 28 | 0 | 否 | [JSON](../../data/conversations/6ac8f2cd-5ce4-83ec-818b-2a1647207946.json) |
| L18 | [调研 Policy 方案](https://chatgpt.com/c/6ac89257-4b28-83ec-b5b3-4f6b158ad078) | 119 | 0 | 否 | [JSON](../../data/conversations/6ac89257-4b28-83ec-b5b3-4f6b158ad078.json) |
| L19 | [JSON RPC定义񎟞](https://chatgpt.com/c/6ac8b9dc-0d98-83ec-8a2c-36ef79786e51) | 21 | 0 | 否 | [JSON](../../data/conversations/6ac8b9dc-0d98-83ec-8a2c-36ef79786e51.json) |
| L20 | [理解图表语言引擎](https://chatgpt.com/c/6ac86280-1cc0-83ec-b118-e86dad86bb5c) | 21 | 0 | 否 | [JSON](../../data/conversations/6ac86280-1cc0-83ec-b118-e86dad86bb5c.json) |

另有 U01：[历史附件](../../raw/uploaded/conversations-responses.json)，标题为“GPT六智能界面原理”，包含 11 个 DIL 样本，`has_previous_page=false`。附件中有 3 个 DIL 消息没有出现在本次 L01 的近期分页中，因此附件提供了实际新增证据，不能只把它当成重复备份。

各响应体的 SHA-256、对话 ID、页游标、消息 ID 与提取索引均保存在 [manifest.json](../../analysis/manifest.json)。原始 JSON 按字节保存；格式化代码是独立文件，不覆盖原始响应或原始 `code` 字符串。

### 来源定位约定

`L08-M5` 表示第 8 个实时对话的 `messages[5]`，数组下标从零开始。其源码路径是 `messages[5].content.parts`，编译表示路径是 `messages[5].metadata.model_dil_v2.code`。`U01-M10` 表示附件的 `messages[10]`。完整消息 ID 在索引中，避免把下标当成跨版本稳定标识。

每个样本同时导出：

```text
dil/L08-M5.source.md       content.parts 的字符串部分
dil/L08-M5.raw.js          code 字符串原样
dil/L08-M5.formatted.js    相同代码的排版版本
dil/L08-M5.data.json       常量、appData、fallback、宿主依赖及 view_state
```

## 3. 响应中的数据组织

以下是从实际字段概括的结构示意，示意中的占位文本不是真实响应全文：

```json
{
  "messages": [{
    "content": {"content_type": "text", "parts": ["Markdown + DIL 模板"]},
    "metadata": {
      "model_dil_v2": {
        "code": "JavaScript 渲染表示",
        "constants": {"0": "文本或其他常量"},
        "fallbackMarkdown": "普通 Markdown 表示",
        "fallbackMarkdownVersion": 1,
        "requiredComponents": ["Cite"],
        "appData": {
          "opGenui": {
            "componentResults": {},
            "interactionSurface": "mainline",
            "modelDataBindings": {}
          }
        }
      },
      "view_state": {"root": {"choice": "B", "revealed": true}}
    }
  }]
}
```

`interactionSurface` 并非每条消息都有；上面的状态值来自 L08-M5。全部 67 个独立 DIL 样本中，观察到的 `modelDataBindings` 都是空对象。存在读取入口不等于已经观察到通用双向数据绑定。

### 渲染入口与常量表

以下开头逐字摘自 [L08-M5.raw.js](../../dil/L08-M5.raw.js)，后续渲染树省略：

```javascript
function __dilSafe(evaluate,failureValue){try{return evaluate()}catch{return failureValue}}

DIL.render(__dil.jsx(()=>{const __dilConstants=DIL.useConstants();const __dilModelDataBindings=DIL.useAppData((appData)=>appData.opGenui?.modelDataBindings??{});const [choice,setChoice] = DIL.useState("B",{key:"choice"})
const [revealed,setRevealed] = DIL.useState(false,{key:"revealed"})
```

此摘录是开头片段，不是独立可运行程序。完整文件以 `__dil.jsx` 的函数组件和 `key:"body:2"` 包裹渲染。`__dil.jsx` 的调用目标既有字符串，例如 `"box"`，也有宿主标识符，例如 `Cite`；多个节点使用 `__dil.Fragment` 分组。

`__dilSafe` 在表达式求值失败时返回指定值，实际回退值包括 `null`、`false`、`[]`。这能确认错误处理，不能证明安全隔离、可执行 API 白名单或任意 JavaScript 都被允许。

## 4. 已验证的模板语法

### 标签、属性、表达式和 Markdown 混排

真实源码允许以下形式：

| 形式 | 实际例子 | 来源 |
|---|---|---|
| 布尔属性 | `<button block ...>`、`<box border ...>` | L08-M5 |
| 字符串属性 | `radius="xl"`、`direction="col"` | L08-M5 |
| 数字表达式 | `padding={3}`、`rows={2}` | L08-M5、L12-M24 |
| 对象表达式 | `padding={{x:2,y:1}}` | L01-M69 |
| 标识符绑定 | `value={choice}`、`onChange={setDetails}` | L08-M5、L12-M24 |
| 箭头函数 | `onClick={()=>setRevealed(true)}` | L08-M5 |
| 多语句事件函数 | `v=>{setChoice(v);setRevealed(false)}` | L08-M5 |
| 动态三元表达式 | `name={choice==="B"?"check-circle":"info"}` | L08-M5 |
| 模板字符串 | ``width={`${m.p}%`}`` | L01-M30 |
| 自闭合 | `<icon .../>`、`<textarea .../>` | L08-M5、L12-M24 |
| Markdown 子内容 | `**...**`、行内反引号 | L08-M5 |
| 大写宿主组件 | `<Cite .../>`、`<AsyncImage .../>` | L07-M4 等 |

它不是纯 HTML，也不是可以原封不动交给标准 JSX Parser 的文件：除了标签之外，还混有 Markdown、块指令和 `{@body}`。JSX 与 React 是不同概念，HTML 风格标签本身不能证明运行库就是 React。[React JSX 文档](https://react.dev/learn/writing-markup-with-jsx)仅用于这个语言比较，不用于证明 DIL 的内部实现。

### `{#each}`：真实源码与 `.map()` 成对出现

下面逐字摘自 [L06-M14.source.md](../../dil/L06-M14.source.md)，保留完整控制块：

```text
    {#each [{s:"Inbox",d:"待分类"},{s:"Backlog",d:"已接受，未排期"},{s:"Ready",d:"条件完整，可执行"},{s:"In Progress",d:"开发中"},{s:"In Review",d:"待评审/验收"},{s:"Done",d:"工作完成"}] as item,i}
      <grid-item>
        <box background="surface-secondary" radius="md" padding={2} gap={1} align="center">
          <text weight="medium" size="sm">{item.s}</text>
          <text color="secondary" size="2xs">{item.d}</text>
        </box>
      </grid-item>
    {/each}
```

同一消息的编译表示中，可以直接找到以下表达式开头（后续 JSX 调用省略）：

```javascript
([{s:"Inbox",d:"待分类"},{s:"Backlog",d:"已接受，未排期"},{s:"Ready",d:"条件完整，可执行"},{s:"In Progress",d:"开发中"},{s:"In Review",d:"待评审/验收"},{s:"Done",d:"工作完成"}]).map((item,i)=>
```

对应关系包括：数组表达式保持；`as item,i` 变为回调参数；`item.s` / `item.d` 变为受 `__dilSafe` 保护的文本表达式；最外层数组计算有 `[]` 回退。L01-M30 中还观察到 `key={m.name}`、`.toFixed(1)` 和模板字符串百分比宽度。

这次确认来自同一条实际 UI 消息的两种表示，而不是根据某个代码块里的 `.map()` 猜测原始语法。其语法外观接近 [Svelte each 块](https://svelte.dev/docs/svelte/each)，但不能由此推断 DIL 使用 Svelte 编译器或实现其完整语义。

### `{@body}` + `{#if}`：真实交互式路由题

下列完整界面块逐字摘自 [L08-M5.source.md](../../dil/L08-M5.source.md)：

```text
{@body const [choice,setChoice] = DIL.useState("B")}
{@body const [revealed,setRevealed] = DIL.useState(false)}
<box border radius="xl" padding={3} gap={3}>
  **你认为内核会选择哪条路由？**

  <radio-group direction="col" value={choice} onChange={v=>{setChoice(v);setRevealed(false)}}>
    <radio value="A">A. `192.168.1.0/24 dev eth0`</radio>
    <radio value="B">B. `10.0.0.0/8 via 192.168.1.2 dev eth0`</radio>
    <radio value="C">C. `default via 192.168.1.1 dev eth0`</radio>
  </radio-group>
  <button block onClick={()=>setRevealed(true)}>检查答案</button>
  {#if revealed}
    <box background="surface-secondary" radius="lg" padding={3} gap={2}>
      <row align="center" gap={2}>
        <icon name={choice==="B"?"check-circle":"info"} color={choice==="B"?"success":"secondary"}/>
        **{choice==="B"?"回答正确！":"正确答案是 B"}**
      </row>
      `10.20.30.40` 同时匹配 `10.0.0.0/8` 和默认路由 `/0`，但 `/8` 前缀更长，所以选择 B。下一跳 IP 是 `192.168.1.2`，出口网卡是 `eth0`。
    </box>
  {/if}
</box>
```

同一消息编译出的状态声明为：

```javascript
const [choice,setChoice] = DIL.useState("B",{key:"choice"})
const [revealed,setRevealed] = DIL.useState(false,{key:"revealed"})
```

原模板的 `DIL.useState` 只有初始值参数，编译表示额外带状态名 `key`。这支持“编译表示生成了稳定状态标识”的推断，但不足以定义 `key` 的完整生命周期语义。

条件渲染对应：

```javascript
(__dilSafe(()=>(revealed),false)) ? /* box 子树 */ : null
```

这一行是为了展示结构而省略中间子树的摘录，不是原始完整语句。真实源码只展示了无 else 的 if；`{:else}` 和 `{:else if}` 的有效性不能从这条样本得出。其外观可与 [Svelte if 块](https://svelte.dev/docs/svelte/if)比较。

### 一个有限的语法摘要

下面是从样本归纳的识别摘要，不是完整 EBNF 或官方解析器规范：

```text
element    := <name props> mixed-content </name> | <name props/>
prop       := flag | name="string" | name={JavaScript-expression}
each       := {#each expression as item[,index]} mixed-content {/each}
if         := {#if expression} mixed-content {/if}
body       := {@body JavaScript-declaration}
content    := Markdown + element + expression + observed-directives
```

解析器实现仍需要另外确认花括号与模板字符串嵌套、Markdown 代码围栏、作用域、标签边界及转义规则。本次没有测试任意声明、任意控制指令、导入语句或顶层 script 标签。

## 5. 状态、事件和宿主动作

### 已观察的 DIL 入口

| 调用 | 样本中的用途 | 能确认的范围 |
|---|---|---|
| `DIL.render(...)` | 接收由 `__dil.jsx` 构造的根 | 每个样本的渲染入口 |
| `DIL.useConstants()` | 读取被抽离的文本等常量 | 常量表实际被引用 |
| `DIL.useAppData(selector)` | 选择 `opGenui.modelDataBindings` | 该选择器；绑定结果为空 |
| `DIL.useState(initial,{key})` | choice/revealed/result/details | 四个具体状态调用；未观察其他 hooks |

`radio-group` 与 `textarea` 的 `onChange` 直接接状态 setter，或接以 `v` 为参数的函数。在这些样本中它们按值回调的写法使用；不能据此声称所有控件的回调参数都是值，或所有控件都沿用 DOM Event。

L08-M5 的 `metadata.view_state` 实际为：

```json
{"root":{"choice":"B","revealed":true}}
```

源码初始值是 `revealed=false`，响应保留的界面状态则为 `true`，网页初次检查时也显示 B 已选中及“回答正确”。这支持宿主保存/恢复界面状态的解释，但保存位置、触发时机、合并规则和跨设备行为仍未知。本次没有改写该题的状态来测试持久化。

### `GenUI.openUrl`

下面是 L12-M24 的实际按钮调用，原始排版经过格式化，文本常量仍保留索引：

```javascript
__dil.jsx(
  "button",
  {
    block: true,
    onClick: () => GenUI.openUrl("https://webdevicetest.com/en/tools/midi-input-test"),
  },
  __dilConstants["4"],
  __dil.jsx("icon", { name: "external-link", inline: true }),
)
```

可以确认 DIL 事件代码引用一个宿主 URL 动作。是否新标签打开、URL 校验规则及允许协议，需要运行时实现或实际点击才能验证；此次没有点击。

### `GenUI.issueNewTurn`

下列是 [L12-M24.source.md](../../dil/L12-M24.source.md) 的实际表单块，保留提交按钮和参数表达式：

```text
{@body const [result,setResult] = DIL.useState("success")}
{@body const [details,setDetails] = DIL.useState("")}
<box border radius="xl" padding={3} gap={3}>
  <radio-group direction="col" value={result} onChange={setResult}>
    <radio value="success">成功了，能看到 Note On / Note Off</radio>
    <radio value="nodevice">浏览器支持 MIDI，但找不到钢琴设备</radio>
    <radio value="nomessage">看到了设备，但弹琴没有 MIDI 消息</radio>
    <radio value="unsupported">Chrome 提示不支持 Web MIDI 或权限错误</radio>
    <radio value="other">其他情况</radio>
  </radio-group>
  <box gap={1}>
    <label>补充信息（可选）</label>
    <textarea rows={2} value={details} onChange={setDetails} placeholder="例如：设备列表显示 USB MIDI，但按键无反应……"/>
  </box>
  <button block onClick={()=>GenUI.issueNewTurn(`我使用小米 Pad 8 Pro 连接特伦斯 V30 Pro，在 Chrome 中测试 MIDI。结果：${({success:"成功，能看到 Note On / Note Off",nodevice:"浏览器支持 MIDI，但找不到钢琴设备",nomessage:"看到设备，但弹琴没有 MIDI 消息",unsupported:"Chrome 提示不支持 Web MIDI 或权限错误",other:"其他情况"})[result]}。补充信息：${details || "无"}。请根据结果指导我下一步。`)}>提交测试结果 <icon name="arrow-right" inline/></button>
</box>
```

`GenUI.issueNewTurn` 接收由选项值与补充文本拼接出的字符串。根据名称、按钮标签和参数，可推断其意图是发起一个新的聊天 turn；此次只读取代码，没有点击“提交测试结果”，因此不声称已经核验发送、确认、消息角色或后端请求行为。

另外，L15-M10 的按钮事件是 `onClick:()=>{}`。组件调用存在并不意味着按钮一定有实际业务动作。

### 宿主解析组件自带的动作数据

L04-M24 的 `Entity` 解析结果中还有实际的 `click_action` 字段，下面省略 payload 中的事件统计字段：

```json
{
  "handler": "client",
  "type": "open_entity_detail",
  "payload": {
    "query": "OCaml",
    "category": "software",
    "extraParams": {"disambiguation": "函数式编程语言"}
  }
}
```

它位于 `model_dil_v2.appData.opGenui.componentResults[resolutionId].state.click_action`，与模型编写的 `onClick` 是两种不同层次的动作表示。这里可以确认一种具体宿主动作结构，不能泛化成已公开的统一 Action Schema。

## 6. 组件、属性与设计值

完整统计见 [02-dil-component-catalog.md](./02-component-catalog.md)，机器可读数据见 [components.json](../../analysis/components.json)。目录包括实际属性值、表达式类型和来源，以下给出概览。

| 类别 | 名称 |
|---|---|
| 布局 | `box`、`row`、`col`、`grid`、`grid-item` |
| 文本与展示 | `text`、`title`、`bold`、`italic`、`code`、`caption`、`blockquote`、`math`、`icon`、`badge`、`divider` |
| 列表与表格 | `list`、`list-item`、`table`、`table-row`、`table-cell` |
| 交互 | `button`、`radio-group`、`radio`、`label`、`textarea` |
| SVG 节点 | `svg`、`defs`、`marker`、`rect`、`path` |
| 宿主解析组件 | `Cite`、`Link`、`Entity`、`AsyncImage`、`AsyncImageGroup` |
| 内部占位节点 | `__chatgptClientDefinedWidget` |

属性值方面，有几组容易影响兼容实现的细节：

- `padding` 不只有数字：实际出现 `{x:2,y:1}`、`{left:4}` 等对象。
- `border` 不只有布尔值：实际出现 `{size:1,color:"default",style:"dashed"}`。
- `gap` 有数字，也有 `"5px"`、`"1px"`；`flex` 同时有字符串 `"1"` 和数值 `1`、`2`、`0.5`。
- `radius` 实际出现 `xs/sm/md/lg/xl/full`；`title.size` 出现 `md/lg/xl/2xl`。
- 颜色值有 `surface`、`surface-secondary`、`surface-tertiary` 等设计语义，也有十六进制和 rgba 字符串。
- `text` 在 SVG 中有 `x/y/fontSize/textAnchor/fill/fontWeight`。这些不是普通文本组件通用属性范围的充分证据。
- 图标按 `name` 请求，出现 `piano`、`arrow-down`、`network`、`check-circle` 等。名称相似不能确认底层图标库。

数字间距究竟对应多少像素、token 如何映射到主题、SVG 下的 text 如何分派，以及各属性允许的完整值域，均未读取组件实现来验证。不要把观测值集合当作官方 enum。

### SVG 与 JavaScript 表达式

以下控制块逐字摘自 [L14-M8.source.md](../../dil/L14-M8.source.md)，是实际 SVG 内循环：

```text
    {#each [0,1,2] as i}
      <rect x={14+i*116} y="8" width="80" height="28" rx="8" fill="#64748b" fillOpacity=".15" stroke="#94a3b8"/>
      <text x={54+i*116} y="26" fontSize="11" textAnchor="middle" fill="currentColor">玩家 {["A","B","C"][i]}</text>
      <path d={`M${54+i*116} 36 V54`} stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrow1)"/>
      <rect x={14+i*116} y="57" width="80" height="34" rx="7" stroke="#64748b" fill="#64748b" fillOpacity=".12"/>
      <text x={54+i*116} y="78" fontSize="11" textAnchor="middle" fill="currentColor">Worker</text>
      <path d={`M${54+i*116} 91 V111 L170 131`} stroke="#94a3b8" strokeWidth="1.4" fill="none"/>
    {/each}
```

可以确认：样本支持 SVG 节点表达、算术属性、数组索引、模板字符串路径和循环生成。不能据此确认全部 SVG 元素、事件、滤镜或脚本都可用。

### 宿主依赖和异步解析

实际 `requiredComponents` 涉及 `Cite`、`Link`、`Entity`、`AsyncImage`、`AsyncImageGroup`。调用中常见编译加入的 `__resolutionId`；同一 ID 在 `componentResults` 下有解析记录，包含 `componentName`、`status`、`state` 和 `safe_urls` 等信息。

观察到的宿主属性包括：

| 组件 | 属性 |
|---|---|
| `Cite` | `ref`、`refs`、`__resolutionId` |
| `Link` | `url`、`ref`、`title`、`__resolutionId` |
| `Entity` | `category`、`value`、`disambig`、`__resolutionId` |
| `AsyncImage` | `query`、`aspectRatio`、`maxWidth`、`__resolutionId` |
| `AsyncImageGroup` | `query`、`aspectRatio`、`layout`、`__resolutionId` |

L07-M4 中，`AsyncImage` 的 `query` 是图片搜索文字，`aspectRatio="5:4"`；解析结果包含图片 URL 和显示状态。L14-M14 中，`AsyncImageGroup.query` 是字符串数组，`layout="carousel"`。这说明这些组件参与宿主解析，不能把它们直接等同于一个 `<img src=...>`。

### 客户端定义占位节点

编译代码还反复出现类似结构（以下是保留实际结构的简化示意）：

```javascript
constant == null
  ? __dil.jsx("__chatgptClientDefinedWidget", { key: "cdw:0", invocationId })
  : constant.type === "math"
    ? __dil.jsx("math", { key: "cdw:0", value: constant.value })
    : constant.type === "text"
      ? __dil.jsx("text", { key: "cdw:0" }, constant.value)
      : null
```

L15-M10 的实际 `constants[4]`、`constants[7]` 为 `null`，对应源码中的代码块位置。此模式支持“部分正文节点由客户端按 invocationId 接管”的解释。上述局部变量名是为说明替换的，不是原始源码；精确调用见 [L15-M10.formatted.js](../../dil/L15-M10.formatted.js)。该内部名称不能据此当成面向模型的公开组件接口。

## 7. 对此前结论的修正

此前对话中的助手文字只作为研究线索，不作为协议证据。此次有以下实质更新：

1. **`{#each}`、`{#if}` 已取得直接模板证据。** 旧研究重点读 `model_dil_v2.code`，但附件的 `content.parts` 本身就保存过 each。新的路由样本补充 if 和 body 声明。现在可以比较同一消息的源码与编译结果。
2. **交互不再是空白。** 找到按钮、单选、textarea、四个 useState 调用和两个 GenUI 宿主动作代码。
3. **组件数从旧样本的 19 个扩大为 37 个调用目标。** 这包括 SVG 与内部占位节点，分类和统计口径必须说明；不意味着完整库只有这些。
4. **内容中的组件名列表不算组件调用。** U01-M10 的 `Slider/Input/Chart/Button/Table/Card` 是循环生成的文字标签。只有 AST 中确实出现的 `__dil.jsx` 调用目标才纳入本次组件目录。
5. **原模板与编译表示依然不是模型原始 token。** Conversation API 可能保存了服务端整理后的内容；这次没有捕获生成时的逐 token/SSE 流，也没有获取编译器实现。

## 8. 能用于转换器研究的结论

这些样本支持把输入研究成“Markdown + 组件标签 + JavaScript 表达式 + 模板控制块 + 宿主依赖”的混合表示。完整输入不能直接按标准 JSX 文本解析；`model_dil_v2.code` 则可以用标准 JavaScript AST 解析。本次使用 Acorn 静态解析所有提取的代码，没有执行响应中的渲染代码。

若要做转换，源码与编译表示应共同用作测试语料。可以据实际样本建立组件树、列表生成、条件、常量、局部状态和动作的中间表示；宿主的 Cite、Entity、图片解析以及新 turn 动作需要明确适配。状态和任意 JavaScript 表达式不是单纯改标签名就能等价转换的。

这批资料没有实现 DIL → A2UI 转换器，也没有验证 A2UI 与这些表达式或宿主行为一一等价。实际编译器是否公开、是否适合独立复用、是否与某个产品模型绑定，仍然没有直接证据。

## 9. 限制与复核

| 限制 | 对结论的影响 |
|---|---|
| 单一账号、一次采样日期、自然使用形成的 20 个对话 | 不能代表全产品组件和语法空间 |
| 6 个实时响应的 `has_previous_page=true` | 这些对话的更早历史不在实时采样中；L01 的旧附件补充了其中部分内容 |
| 没有生成流/SSE、编译器源码或组件注册表 | 无法证明模型原始 token、编译位置或完整 builtin 库 |
| 没有触发新 turn、外链或图片动作 | 宿主动作是静态观测，网络行为与权限规则未做运行验证 |
| `modelDataBindings` 全为空 | 无法定义实际应用数据绑定协议 |
| AST 调用点与屏幕实例不同 | 循环不会展开计数；条件分支和回退节点可能未显示 |
| 本文未核验对话里的模型排行、网络知识、产品事实 | 示例内容仅用于研究语法，不能据此确认事实正确 |

复核时先查源 JSON 的消息 ID，再比较 `.source.md` 与 `.raw.js`；需要阅读时使用 `.formatted.js`。完整的内容偏移、属性表达式和去重关系在 manifest 中。原始响应没有另存 Cookie 或 Authorization 请求头；响应体仍保留用户原有的私人对话内容，资料包的用途是本地研究。

文件目录：

```text
generative-ui-research/
  docs/01-dil-empirical-research.md
  docs/02-dil-component-catalog.md
  raw/recent-list.json
  raw/uploaded/                     历史上传对话响应体
  data/conversations/               原始会话响应体（一份会话一个文件）
  dil/                              源模板、原始/格式化代码、配套数据
  analysis/manifest.json
  analysis/components.json
  analysis/hooks-actions.json
  evidence/dom/                     页面快照
```
