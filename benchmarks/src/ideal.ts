/**
 * Hand-written "ideal" answers, one per case, so `scoring.test.ts` can verify every
 * check is satisfiable and discriminating without calling a live model.
 */

export const IDEAL_ANSWERS: Record<string, string> = {
  "codemode-sandbox": `<box border padding={2}>
  <badge>宿主进程</badge>
  <row gap={2}>
    <box border padding={2}><text>隔离环境中的模型代码</text></box>
    <icon name="arrow-right"/>
    <text>由宿主转发工具调用</text>
  </row>
</box>`,
  "pi-system-prompt-construct": `<box padding={2}>
  <row justify="between"><text>内置指令与工具定义</text><text>60%</text></row>
  <box width="60%" background="muted"><text>基础指令</text></box>
  <row justify="between"><text>项目与技能上下文</text><text>40%</text></row>
  <box width="40%" background="muted"><text>项目上下文</text></box>
</box>`,
  states: `Git 工作区有五个主要状态：

<grid columns={2} gap={2}>
  <box><text>Untracked → Staged</text><code>git add</code></box>
  <box><text>Staged → Committed</text><code>git commit</code></box>
  <box><text>Modified → Staged</text><code>git add</code></box>
  <box><text>Committed → Pushed</text><code>git push</code></box>
</grid>

<badge color="success">可逆：Staged → Untracked</badge>`,
  "interactive-quiz": `{@body const [choice, setChoice] = DIL.useState("")}
{@body const [revealed, setRevealed] = DIL.useState(false)}

<box border radius="xl" padding={3} gap={2}>
  <title>HTTP 幂等性自测</title>
  <text>以下哪个 HTTP 方法在规范中默认不是幂等的？</text>
  <radio-group value={choice} onChange={setChoice}>
    <radio value="GET">GET</radio>
    <radio value="PUT">PUT</radio>
    <radio value="POST">POST</radio>
    <radio value="DELETE">DELETE</radio>
  </radio-group>
  <button color="primary" onClick={() => setRevealed(true)}>查看解析</button>
  {#if revealed}
    <box background="surface-secondary" radius="md" padding={2}>
      <text>{choice === "POST" ? "回答正确！" : "答案是 POST。"}POST 每次请求都可能创建新资源，不保证幂等性。</text>
    </box>
  {/if}
</box>`,
};
