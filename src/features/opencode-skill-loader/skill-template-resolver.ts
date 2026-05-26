import type { LoadedSkill } from "./types"
import type { SkillResolutionOptions } from "./skill-resolution-options"
import { injectGitMasterConfig } from "./git-master-template-injection"
import { getAllSkills } from "./skill-discovery"
import { extractSkillTemplate } from "./loaded-skill-template-extractor"

export async function resolveMultipleSkillsAsync(
	skillNames: string[],
	options?: SkillResolutionOptions
): Promise<{ resolved: Map<string, string>; notFound: string[] }> {
	const allSkills = await getAllSkills(options)
	const skillMap = new Map<string, LoadedSkill>()
	for (const skill of allSkills) {
		skillMap.set(skill.name, skill)
	}

	const resolved = new Map<string, string>()
	const notFound: string[] = []

	for (const name of skillNames) {
		const skill = skillMap.get(name)
		if (skill) {
			const template = await extractSkillTemplate(skill)
			if (name === "git-master") {
				resolved.set(name, injectGitMasterConfig(template, options?.gitMasterConfig))
			} else {
				resolved.set(name, template)
			}
		} else {
			notFound.push(name)
		}
	}

	return { resolved, notFound }
}
