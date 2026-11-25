import { readDilViewState } from "@kkkiio/dil-core";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { DilRenderer } from "../dist/index.js";

const first = [
  "{@body const [count, setCount] = DIL.useState(0)}",
  "<text>Checked items: {count}</text>",
  "<button onClick={() => setCount(count + 1)}>Check item</button>",
  "",
  "Tips: ~~Old guide~~ [Guide](./guide)",
  "",
  "```text",
  "Inventory example",
  "```",
].join("\n");
const middle = `${first}\n\n<text>Checking the inventory</text>\n\n$$\nx^2`;
const final = `${middle}\n$$\n\n<text>Inventory complete</text>`;
const execution = new URL(location.href).searchParams.get("mode") === "direct" ? "direct" : "sandbox";

function Inventory() {
  const [revision, setRevision] = React.useState(0);
  const [restored] = React.useState(() => {
    const saved = localStorage.getItem("inventory");
    return saved === null ? undefined : readDilViewState(JSON.parse(saved));
  });
  return (
    <>
      <button type="button" onClick={() => setRevision(1)}>
        More output
      </button>
      <button type="button" onClick={() => setRevision(2)}>
        Finish output
      </button>
      <DilRenderer
        source={[first, middle, final][revision]}
        isStreaming={revision < 2}
        execution={execution}
        viewState={restored}
        onViewStateChange={(state) => localStorage.setItem("inventory", JSON.stringify(state))}
      />
    </>
  );
}

const mount = document.getElementById("app");
if (!mount) throw new Error("Missing app root");
createRoot(mount).render(<Inventory />);
