export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const chars = [...text]
  if (chars.length <= maxLength) return text
  return chars.slice(0, maxLength).join("") + "..."
}
