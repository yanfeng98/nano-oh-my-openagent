import type { OhMyOpenCodeConfig } from "../config";
import { getAgentDisplayName } from "../shared/agent-display-names";

type AgentWithPermission = { permission?: Record<string, unknown> };

function getConfigQuestionPermission(): string | null {
  const configContent = process.env.OPENCODE_CONFIG_CONTENT;
  if (!configContent) return null;
  try {
    const parsed = JSON.parse(configContent);
    return parsed?.permission?.question ?? null;
  } catch {
    return null;
  }
}

function agentByKey(
  agentResult: Record<string, unknown>,
  key: string,
): AgentWithPermission | undefined {
  return (agentResult[key] ?? agentResult[getAgentDisplayName(key)]) as
    | AgentWithPermission
    | undefined;
}

export function applyToolConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  agentResult: Record<string, unknown>;
}): void {
  const hasTaskSystem = !!params.pluginConfig.experimental?.task_system;
  const denyTodoTools = hasTaskSystem
    ? { todowrite: "deny", todoread: "deny" }
    : {};

  params.config.tools = {
    ...(params.config.tools as Record<string, unknown>),
    "grep_app_*": false,
    LspHover: false,
    LspCodeActions: false,
    LspCodeActionResolve: false,
    "task_*": false,
    teammate: false,
    ...(hasTaskSystem ? { todowrite: false, todoread: false } : {}),
  };

  const questionPermission =
    getConfigQuestionPermission() === "deny" ||
    process.env.OPENCODE_CLI_RUN_MODE === "true"
      ? "deny"
      : "allow";

  const taskBase = { task: "allow", ...denyTodoTools };
  const subAgents = {
    call_omo_agent: "deny",
    "task_*": "allow",
    teammate: "allow",
  };
  const supervisorPerms = {
    ...taskBase,
    ...subAgents,
    question: questionPermission,
  };

  const agentPerms: Record<string, Record<string, unknown>> = {
    librarian: { "grep_app_*": "allow" },
    "multimodal-looker": { task: "deny", look_at: "deny" },
    atlas: { ...taskBase, ...subAgents },
    sisyphus: supervisorPerms,
    prometheus: supervisorPerms,
    hephaestus: {
      ...taskBase,
      call_omo_agent: "deny",
      question: questionPermission,
    },
    "sisyphus-junior": {
      ...taskBase,
      "task_*": "allow",
      teammate: "allow",
    },
  };

  for (const [key, perms] of Object.entries(agentPerms)) {
    const agent = agentByKey(params.agentResult, key);
    if (agent) {
      agent.permission = { ...agent.permission, ...perms };
    }
  }

  params.config.permission = {
    webfetch: "allow",
    external_directory: "allow",
    ...(params.config.permission as Record<string, unknown>),
    task: "deny",
  };
}
