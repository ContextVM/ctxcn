// Helper function to convert a string to PascalCase
export const toPascalCase = (s: string): string => {
  if (!s) {
    return "";
  }
  // Convert to camelCase first, then capitalize the first letter.
  const camelCased = s.replace(/([-_ ]\w)/g, (g) =>
    g ? g.charAt(1).toUpperCase() : "",
  );
  return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
};
