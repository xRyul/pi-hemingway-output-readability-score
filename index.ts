import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { readabilityGrade } from "./readability.ts";

const KEY = "pi-hemingway-output-readability-score";

export default function hemingwayOutputReadability(pi: ExtensionAPI) {
  const clear = (ctx: ExtensionContext) => { if (ctx.hasUI) ctx.ui.setStatus(KEY, undefined); };
  const update = (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;
    clear(ctx);
    if (!ctx.isIdle()) return;
    const entry = ctx.sessionManager.getBranch().findLast(entry => entry.type === "message" && entry.message.role === "assistant");
    if (entry?.type !== "message" || entry.message.role !== "assistant") return;
    const message = entry.message;
    if (message.stopReason !== "stop" || message.content.some(block => block.type === "toolCall")) return;
    const text = message.content.filter(block => block.type === "text").map(block => block.text).join("\n");
    const grade = readabilityGrade(text);
    if (grade !== undefined) ctx.ui.setStatus(KEY, `Hemingway: Grade ${grade}`);
  };

  pi.on("agent_start", (_event, ctx) => clear(ctx));
  pi.on("agent_settled", (_event, ctx) => update(ctx));
  pi.on("session_start", (_event, ctx) => update(ctx));
  pi.on("session_tree", (_event, ctx) => update(ctx));
  pi.on("session_shutdown", (_event, ctx) => clear(ctx));
}
