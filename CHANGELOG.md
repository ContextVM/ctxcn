# @contextvm/ctxcn

## 1.0.11

### Patch Changes

- chore: bump sdk version

## 1.0.10

### Patch Changes

- chore: bump contextvm sdk

## 1.0.9

### Patch Changes

- refactor(utils): improve client code generation with deduplicated named types and singleton instance

## 1.0.8

### Patch Changes

- refactor(utils): improve client code generation with named types and singleton instance

- Replace inline type definitions with named types for better maintainability
- Add handling for empty object schemas using Record<string, unknown>
- Generate type definitions at the top of client files for better organization
- Update JSDoc comments to reference named types instead of inline types
- Add singleton client instance for convenience with default configuration
- Refactor method generation to use named input/output types consistently

## 1.0.7

### Patch Changes

- feat(utils): add schema reference resolution

  Add `resolveSchemaRefs` function to resolve internal $ref references in JSON schemas. Update `generateTypeFromSchema` to resolve references before generating TypeScript types. This allows schemas with $ref to be properly converted to TypeScript types.

## 1.0.6

### Patch Changes

- fix(utils): fix toPascalCase and refactor generateClientCode
  - Fix toPascalCase to handle null, undefined, and edge cases properly
  - Refactor generateClientCode to use the improved toPascalCase and improve code structure
  - Add tests to ensure correctness and prevent regressions

## 1.0.5

### Patch Changes

- fix: remove process usage

## 1.0.4

### Patch Changes

- refactor(cli): centralize error handling and file operations

  Centralize error handling with new error handler utilities
  Extract file operations into reusable utility functions
  Simplify client connection logic with a new connection utility
  Remove duplicate code and improve maintainability

## 1.0.3

### Patch Changes

- feat(cli): enhance add command to support updating existing clients
  - Add interactive prompt when client already exists to update or cancel
  - Prevent duplicate entries in config.addedClients array
  - Update README with improved quickstart guide and configuration examples
  - Change default relay to wss://relay.contextvm.org
  - Improve client code generation with environment variable support

## 1.0.2

### Patch Changes

- fix build

## 1.0.1

### Patch Changes

- Initial release of ctxcn - A command-line utility for integrating ContextVM (CVM) servers into TypeScript projects

  Features:
  - Interactive project initialization
  - Type-safe client code generation from CVM server tool definitions
  - Configuration management for relays and private keys
  - Client update functionality
  - Fixed duplicate keystroke issue in CLI interface
