// Set a default log level for the SDK to reduce noise during CLI operations.
// This must be done before any SDK modules are imported.
// This can be overridden by the user by setting the LOG_LEVEL environment variable.
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = "error";
}
