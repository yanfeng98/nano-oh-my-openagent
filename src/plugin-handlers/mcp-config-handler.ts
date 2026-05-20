import type { OhMyOpenCodeConfig } from "../config";
import { loadMcpConfigs } from "../features/claude-code-mcp-loader";
import { createBuiltinMcps } from "../mcp";
import type { PluginComponents } from "./plugin-components-loader";

type McpEntry = Record<string, unknown>;

export async function applyMcpConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  pluginComponents: PluginComponents;
}): Promise<void> {
  const disabledSet = new Set(params.pluginConfig.disabled_mcps ?? []);
  const userMcp = params.config.mcp as Record<string, unknown> | undefined;

  const loadedServers = params.pluginConfig.claude_code?.mcp ?? true
    ? await loadMcpConfigs(disabledSet)
    : {};

  const merged = {
    ...createBuiltinMcps(disabledSet, params.pluginConfig),
    ...(userMcp ?? {}),
    ...loadedServers,
    ...params.pluginComponents.mcpServers,
  } as Record<string, McpEntry>;

  if (userMcp) {
    for (const [name, value] of Object.entries(userMcp)) {
      if (
        merged[name] &&
        value &&
        typeof value === "object" &&
        "enabled" in value &&
        (value as McpEntry).enabled === false
      ) {
        merged[name] = { ...merged[name], enabled: false };
      }
    }
  }

  for (const name of disabledSet) {
    delete merged[name];
  }

  params.config.mcp = merged;
}
