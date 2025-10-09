# @contextvm/ctxcn

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
