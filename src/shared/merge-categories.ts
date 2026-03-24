import type { CategoriesConfig, CategoryConfig } from "../config/schema"
import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants"

export function mergeCategories(
  userCategories?: CategoriesConfig,
): Record<string, CategoryConfig> {
  const merged = userCategories
    ? { ...DEFAULT_CATEGORIES, ...userCategories }
    : { ...DEFAULT_CATEGORIES }

  return Object.fromEntries(
    Object.entries(merged).filter(([, config]) => !config.disable),
  )
}
