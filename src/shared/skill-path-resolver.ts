import { join } from "path"

export function resolveSkillPathReferences(content: string, basePath: string): string {
	const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
	return content.replace(
		/(?<![a-zA-Z0-9])@([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\-\/]*)/g,
		(_, relativePath: string) => join(normalizedBase, relativePath)
	)
}
