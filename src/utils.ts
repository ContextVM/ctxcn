// Helper function to convert a string to PascalCase
export const toPascalCase = (s: string): string => {
  if (!s) {
    return "";
  }
  // First replace forward slashes with hyphens to handle names like 'example-servers/everything'
  const normalized = s.replace(/\//g, '-');
  // Convert to camelCase first, then capitalize the first letter.
  const camelCased = normalized.replace(/([-_ ]\w)/g, (g) =>
    g ? g.charAt(1).toUpperCase() : "",
  );
  return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
};
