export function handleCliError(error: unknown, context: string): void {
  console.error(`❌ Error in ${context}:`, error);
  process.exit(1);
}

export function handleConfigError(): void {
  console.error("❌ Error: Configuration file 'ctxcn.config.json' not found.");
  console.error(
    "Please run 'ctxcn init' first to create a configuration file.",
  );
  process.exit(1);
}

export function handleValidationError(message: string): void {
  console.error(`❌ Validation Error: ${message}`);
  process.exit(1);
}
