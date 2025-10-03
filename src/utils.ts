/**
 * Convert a string to PascalCase
 * Handles various separators: spaces, hyphens, underscores, and forward slashes
 */
export const toPascalCase = (s: string): string => {
  if (!s || typeof s !== "string") {
    return "";
  }

  // Replace forward slashes with hyphens to handle names like 'example-servers/everything'
  const normalized = s.replace(/\//g, "-");

  // Convert to camelCase first, then capitalize the first letter
  const camelCased = normalized
    .toLowerCase()
    .replace(/([-_ ]\w)/g, (g) => (g ? g.charAt(1).toUpperCase() : ""));

  return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
};
