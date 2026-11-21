import {
  attributeContains,
  type CaseCheck,
  cleanDiagnostics,
  compilesAndRuns,
  type DilCase,
  either,
  hasAnyTag,
  hasIf,
  hasStateDeclaration,
  hasTag,
  nested,
} from "./scoring.ts";

export const DIL_CASES: readonly DilCase[] = [
  {
    id: "codemode-sandbox",
    track: "agent",
    category: "架构分层与因果流",
    prompt: "解释 pi agent codemode 有哪些隔离机制，在 LLM 用 codemode 执行代码、 codemode 执行 tools 上是怎么体现的",
    why: "图形可以清晰地表达 codemode sandbox 各个模块的边界和包含关系",
    projectRepo: "https://github.com/earendil-works/pi@v1.0.0",
    checks: [
      hasTag("box", { atLeast: 2, label: "进程边界用 <box> 分组" }),
      nested("box", "box", "嵌套 <box>（谁包着谁）"),
      hasTag("row", { label: "流程用 <row> 横向排列" }),
      attributeContains("icon", "name", "arrow", '用 <icon name="arrow-…"> 标方向'),
      hasTag("badge", { label: "边界/协议用 <badge> 标注" }),
      cleanDiagnostics("解析无诊断"),
      compilesAndRuns("编译与沙箱执行通过"),
    ],
  },
  {
    id: "pi-system-prompt-construct",
    track: "agent",
    category: "定量占比与结构拆解",
    prompt:
      "如果我在当前 pi 仓库根目录用默认配置启动 pi coding agent（干净的全局环境，无 ~/.pi 全局配置，自动加载本仓库自带的 extensions、skills 和上下文文件如 AGENTS.md），最终发给模型的 System Prompt 按字符数估算大概有多大？由哪几部分按什么顺序组成，分别占比多少？",
    why: "图像可以同时表达顺序和面积感",
    projectRepo: "https://github.com/earendil-works/pi@v1.0.0",
    checks: [
      either(
        [
          attributeContains("box", "width", "%", '用 <box width="…%"> 表达面积占比'),
          hasTag("svg", { label: "用 <svg> 表达面积占比" }),
        ],
        "用百分比 <box> 或 <svg> 表达面积占比",
      ),
      either(
        [
          nested("box", "box", "嵌套 <box>（外框/轨道 + 分段/填充）"),
          hasTag("svg", { label: "用 <svg> 表达结构层次" }),
        ],
        "嵌套 <box> 或 <svg> 表达结构层次",
      ),
      either(
        [hasTag("row", { label: "用 <row> 横向排布分段或图例" }), hasTag("svg", { label: "用 <svg> 横向排布分段" })],
        "用 <row> 或 <svg> 横向排布分段",
      ),
      cleanDiagnostics("解析无诊断"),
      compilesAndRuns("编译与沙箱执行通过"),
    ],
  },
  {
    id: "states",
    track: "both",
    category: "状态机与分支分类",
    prompt: "梳理 Git 工作区文件从 Untracked 到 Staged、Modified、Committed、Pushed 的状态流转及对应命令。",
    why: "状态流转适合用图来表达",
    checks: [
      either(
        [hasTag("grid", { label: "状态用 <grid> 卡片铺开" }), hasTag("svg", { label: "状态用 <svg> 状态图表达" })],
        "用 <grid> 卡片或 <svg> 表达状态结构",
      ),
      hasTag("box", { atLeast: 2, label: "用 <box> 分组状态或操作" }),
      hasAnyTag("code", { atLeast: 4, label: "每个状态带 <code> 命令标签" }),
      cleanDiagnostics("解析无诊断"),
      compilesAndRuns("编译与沙箱执行通过"),
    ],
  },
  {
    id: "interactive-quiz",
    track: "chat",
    category: "交互式自测卡片",
    prompt: "出一道关于 HTTP 幂等性的单选自测题，让用户选择选项并点击按钮后展开解析。",
    why: "交互式选择题可以通过状态与按钮即时反馈，比纯文本剧透答案更适合学习",
    checks: [
      hasStateDeclaration("使用 {@body DIL.useState} 管理选项/展开状态"),
      hasTag("radio-group", { label: "使用 <radio-group> 承载单选选项" }),
      hasTag("radio", { atLeast: 3, label: "至少 3 个 <radio> 选项" }),
      hasTag("button", { label: "使用 <button> 触发提交或展开答案" }),
      hasIf("使用 {#if} 按状态条件展开解析"),
      cleanDiagnostics("解析无诊断"),
      compilesAndRuns("编译与沙箱执行通过"),
    ],
  },
];

export type { CaseCheck, DilCase };
