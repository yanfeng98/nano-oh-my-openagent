import { createBuiltinAgents } from "../agents";
import { createSisyphusJuniorAgentWithOverrides } from "../agents/sisyphus-junior";
import type { OhMyOpenCodeConfig } from "../config";
import { log, migrateAgentConfig } from "../shared";
import { AGENT_NAME_MAP } from "../shared/migration";
import { getAgentDisplayName } from "../shared/agent-display-names";
import type { LoadedSkill } from "../features/opencode-skill-loader";
import {
  discoverConfigSourceSkills,
  discoverOpencodeGlobalSkills,
  discoverOpencodeProjectSkills,
  discoverProjectClaudeSkills,
  discoverUserClaudeSkills,
} from "../features/opencode-skill-loader";
import { loadProjectAgents, loadUserAgents } from "../features/claude-code-agent-loader";
import type { PluginComponents } from "./plugin-components-loader";
import { reorderAgentsByPriority } from "./agent-priority-order";
import { remapAgentKeysToDisplayNames } from "./agent-key-remapper";
import {
  createProtectedAgentNameSet,
  filterProtectedAgentOverrides,
} from "./agent-override-protection";
import { buildPrometheusAgentConfig } from "./prometheus-agent-config-builder";
import { buildPlanDemoteConfig } from "./plan-model-inheritance";

type AgentConfigRecord = Record<string, Record<string, unknown> | undefined> & {
  build?: Record<string, unknown>;
  plan?: Record<string, unknown>;
};

function migrateDisabledAgentNames(
  disabledAgents: string[] | undefined,
): Set<string> {
  const migrated = (disabledAgents ?? []).map(
    (agent) => AGENT_NAME_MAP[agent.toLowerCase()] ?? agent,
  );
  return new Set(migrated.map((a) => a.toLowerCase()));
}

async function discoverAllSkills(params: {
  pluginConfig: OhMyOpenCodeConfig;
  directory: string;
}): Promise<LoadedSkill[]> {
  const includeClaudeSkills = params.pluginConfig.claude_code?.skills ?? true;

  const [
    configSourceSkills,
    userSkills,
    projectSkills,
    opencodeGlobalSkills,
    opencodeProjectSkills,
  ] = await Promise.all([
    discoverConfigSourceSkills({
      config: params.pluginConfig.skills,
      configDir: params.directory,
    }),
    includeClaudeSkills ? discoverUserClaudeSkills() : Promise.resolve([]),
    includeClaudeSkills
      ? discoverProjectClaudeSkills(params.directory)
      : Promise.resolve([]),
    discoverOpencodeGlobalSkills(),
    discoverOpencodeProjectSkills(params.directory),
  ]);

  return [
    ...configSourceSkills,
    ...opencodeProjectSkills,
    ...projectSkills,
    ...opencodeGlobalSkills,
    ...userSkills,
  ];
}

interface ExternalAgents {
  userAgents: Record<string, unknown>;
  projectAgents: Record<string, unknown>;
  pluginAgents: Record<string, unknown>;
  customAgentSummaries: Array<{ name: string; description: string }>;
}

function gatherExternalAgents(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  directory: string;
  pluginComponents: PluginComponents;
}): ExternalAgents {
  const includeClaudeAgents = params.pluginConfig.claude_code?.agents ?? true;
  const userAgents = includeClaudeAgents ? loadUserAgents() : {};
  const projectAgents = includeClaudeAgents
    ? loadProjectAgents(params.directory)
    : {};

  const pluginAgents = Object.fromEntries(
    Object.entries(params.pluginComponents.agents).map(([key, value]) => [
      key,
      value ? migrateAgentConfig(value as Record<string, unknown>) : value,
    ]),
  );

  const configAgent = params.config.agent as
    | Record<string, Record<string, unknown>>
    | undefined;

  const customAgentSummaries = [
    ...Object.entries(configAgent ?? {}),
    ...Object.entries(userAgents),
    ...Object.entries(projectAgents),
    ...Object.entries(pluginAgents).filter(([, config]) => config !== undefined),
  ]
    .filter(([, config]) => config != null)
    .map(([name, config]) => ({
      name,
      description:
        typeof (config as Record<string, unknown>)?.description === "string"
          ? ((config as Record<string, unknown>).description as string)
          : "",
    }));

  return { userAgents, projectAgents, pluginAgents, customAgentSummaries };
}

function buildBuilderAgent(
  configBuild: Record<string, unknown> | undefined,
  pluginOverride: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const { name: _, ...buildConfigWithoutName } = configBuild ?? {};
  const migrated = migrateAgentConfig(
    buildConfigWithoutName as Record<string, unknown>,
  );
  const base = {
    ...migrated,
    description: `${(configBuild?.description as string) ?? "Build agent"} (OpenCode default)`,
  };
  return pluginOverride ? { ...base, ...pluginOverride } : base;
}

async function buildSpecialAgents(params: {
  isSisyphusEnabled: boolean;
  builtinAgents: Record<string, unknown>;
  configAgent: AgentConfigRecord | undefined;
  pluginConfig: OhMyOpenCodeConfig;
  currentModel: string | undefined;
  useTaskSystem: boolean;
}): Promise<{
  specialAgents: Record<string, unknown>;
  planDemoteConfig: Record<string, unknown> | undefined;
}> {
  if (!params.isSisyphusEnabled || !params.builtinAgents.sisyphus) {
    return { specialAgents: {}, planDemoteConfig: undefined };
  }

  const specialAgents: Record<string, unknown> = {
    sisyphus: params.builtinAgents.sisyphus,
  };

  specialAgents["sisyphus-junior"] = createSisyphusJuniorAgentWithOverrides(
    params.pluginConfig.agents?.["sisyphus-junior"],
    undefined,
    params.useTaskSystem,
  );

  const builderEnabled =
    params.pluginConfig.sisyphus_agent?.default_builder_enabled ?? false;
  if (builderEnabled) {
    specialAgents["OpenCode-Builder"] = buildBuilderAgent(
      params.configAgent?.build,
      params.pluginConfig.agents?.["OpenCode-Builder"] as
        | Record<string, unknown>
        | undefined,
    );
  }

  const plannerEnabled =
    params.pluginConfig.sisyphus_agent?.planner_enabled ?? true;
  let planDemoteConfig: Record<string, unknown> | undefined;

  if (plannerEnabled) {
    const prometheusOverride = params.pluginConfig.agents?.["prometheus"] as
      | (Record<string, unknown> & { prompt_append?: string })
      | undefined;

    specialAgents["prometheus"] = await buildPrometheusAgentConfig({
      configAgentPlan: params.configAgent?.plan,
      pluginPrometheusOverride: prometheusOverride,
      userCategories: params.pluginConfig.categories,
      currentModel: params.currentModel,
    });

    const replacePlan =
      params.pluginConfig.sisyphus_agent?.replace_plan ?? true;
    if (replacePlan) {
      planDemoteConfig = buildPlanDemoteConfig(
        specialAgents["prometheus"] as Record<string, unknown>,
        params.pluginConfig.agents?.plan as Record<string, unknown> | undefined,
      );
    }
  }

  return { specialAgents, planDemoteConfig };
}

function applyDefaultAgent(
  config: Record<string, unknown>,
  isSisyphusEnabled: boolean,
  builtinAgents: Record<string, unknown>,
): void {
  if (!isSisyphusEnabled || !builtinAgents.sisyphus) return;

  const raw = config.default_agent;
  const configuredDefault =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;

  (config as { default_agent?: string }).default_agent =
    getAgentDisplayName(configuredDefault ?? "sisyphus");
}

// =========================================================================
// Agent layer merge (Phase 7)
// =========================================================================

/**
 * Merge agent configs from multiple sources with defined priority.
 *
 * Layer priority (later spreads override earlier ones):
 *
 *   Layer 1 (lowest) — External sources, filtered against protected names:
 *     a. User agents       (~/.claude/agents/)
 *     b. Project agents    (.claude/agents/)
 *     c. Plugin agents     (Claude Code plugins)
 *
 *   Layer 2 — System agents (protected, external cannot override):
 *     d. Builtin agents    (oracle, librarian, explore, metis, momus, atlas,
 *                           hephaestus, multimodal-looker)
 *     e. Special agents    (sisyphus, sisyphus-junior, builder, prometheus)
 *
 *   Layer 3 — User overrides from opencode.json (excluding build/plan keys
 *             that are managed by the system)
 *
 *   Layer 4 (highest) — Hardcoded system config:
 *     f. build: { mode: "subagent", hidden: true }   (sisyphus mode only)
 *     g. plan:  planDemoteConfig                     (if plan demotion active)
 */
function mergeAgentLayers(params: {
  specialAgents: Record<string, unknown>;
  builtinAgents: Record<string, unknown>;
  externalAgents: ExternalAgents;
  userConfigAgent: AgentConfigRecord | undefined;
  planDemoteConfig: Record<string, unknown> | undefined;
  disabledAgentNames: Set<string>;
  isSisyphusEnabled: boolean;
}): Record<string, unknown> {
  const {
    specialAgents,
    builtinAgents,
    externalAgents,
    userConfigAgent,
    planDemoteConfig,
    disabledAgentNames,
    isSisyphusEnabled,
  } = params;

  // Build protected name set (normalized) from system agent keys
  const protectedNames = createProtectedAgentNameSet([
    ...Object.keys(builtinAgents),
    ...Object.keys(specialAgents),
  ]);

  // Filter: remove disabled agents + agents that conflict with protected names
  const filterAll = (agents: Record<string, unknown>) => {
    const withoutProtected = filterProtectedAgentOverrides(
      agents,
      protectedNames,
    );
    return Object.fromEntries(
      Object.entries(withoutProtected).filter(
        ([name]) => !disabledAgentNames.has(name.toLowerCase()),
      ),
    );
  };

  const filteredUserAgents = filterAll(externalAgents.userAgents);
  const filteredProjectAgents = filterAll(externalAgents.projectAgents);
  const filteredPluginAgents = filterAll(externalAgents.pluginAgents);

  // Extract user overrides from opencode.json
  const planDemoted = planDemoteConfig !== undefined;

  const userOverrides = isSisyphusEnabled
    ? Object.fromEntries(
        Object.entries(userConfigAgent ?? {})
          .filter(([key]) => {
            if (key === "build") return false;
            if (key === "plan" && planDemoted) return false;
            if (key in builtinAgents) return false;
            return true;
          })
          .map(([key, value]) => [
            key,
            value
              ? migrateAgentConfig(value as Record<string, unknown>)
              : value,
          ]),
      )
    : (userConfigAgent as Record<string, unknown>) ?? {};

  // Hardcoded build config (sisyphus mode only)
  const buildConfig = {
    ...(userConfigAgent?.build
      ? migrateAgentConfig(userConfigAgent.build as Record<string, unknown>)
      : {}),
    mode: "subagent",
    hidden: true,
  };

  // Merge with defined priority (later spread = higher priority)
  return {
    // Layer 1: External (lowest)
    ...filteredUserAgents,
    ...filteredProjectAgents,
    ...filteredPluginAgents,
    // Layer 2: System
    ...builtinAgents,
    ...specialAgents,
    // Layer 3: User overrides
    ...userOverrides,
    // Layer 4: Hardcoded (highest)
    ...(isSisyphusEnabled ? { build: buildConfig } : {}),
    ...(planDemoteConfig ? { plan: planDemoteConfig } : {}),
  };
}

// =========================================================================
// Post-processing — remap + reorder (Phase 8)
// =========================================================================

function finalizeAgentConfig(
  agents: Record<string, unknown>,
): Record<string, unknown> {
  const remapped = remapAgentKeysToDisplayNames(agents);
  const ordered = reorderAgentsByPriority(remapped);
  log("[config-handler] agents loaded", { agentKeys: Object.keys(ordered) });
  return ordered;
}

export async function applyAgentConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  ctx: { directory: string; client?: any };
  pluginComponents: PluginComponents;
}): Promise<Record<string, unknown>> {

  const disabledAgentNames = migrateDisabledAgentNames(
    params.pluginConfig.disabled_agents,
  );

  const allDiscoveredSkills = await discoverAllSkills({
    pluginConfig: params.pluginConfig,
    directory: params.ctx.directory,
  });

  const externalAgents = gatherExternalAgents({
    config: params.config,
    pluginConfig: params.pluginConfig,
    directory: params.ctx.directory,
    pluginComponents: params.pluginComponents,
  });

  const currentModel = params.config.model as string | undefined;
  const browserProvider =
    params.pluginConfig.browser_automation_engine?.provider ?? "playwright";
  const disabledSkills = new Set<string>(
    params.pluginConfig.disabled_skills ?? [],
  );
  const useTaskSystem = params.pluginConfig.experimental?.task_system ?? false;
  const disableOmoEnv =
    params.pluginConfig.experimental?.disable_omo_env ?? false;

  const builtinAgents = await createBuiltinAgents(
    [...disabledAgentNames],
    params.pluginConfig.agents,
    params.ctx.directory,
    currentModel,
    params.pluginConfig.categories,
    allDiscoveredSkills,
    externalAgents.customAgentSummaries,
    browserProvider,
    currentModel,
    disabledSkills,
    useTaskSystem,
    disableOmoEnv,
  );

  const isSisyphusEnabled =
    params.pluginConfig.sisyphus_agent?.disabled !== true;
  const configAgent = params.config.agent as AgentConfigRecord | undefined;

  const { specialAgents, planDemoteConfig } = await buildSpecialAgents({
    isSisyphusEnabled,
    builtinAgents,
    configAgent,
    pluginConfig: params.pluginConfig,
    currentModel,
    useTaskSystem,
  });

  applyDefaultAgent(params.config, isSisyphusEnabled, builtinAgents);

  // Phase 7: Merge all layers with defined priority
  const merged = mergeAgentLayers({
    specialAgents,
    builtinAgents,
    externalAgents,
    userConfigAgent: configAgent,
    planDemoteConfig,
    disabledAgentNames,
    isSisyphusEnabled,
  });

  // Phase 8: Post-process (key remap + priority reorder)
  const finalized = finalizeAgentConfig(merged);
  params.config.agent = finalized;
  return finalized;
}
