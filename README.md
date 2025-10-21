# ctxcn

`ctxcn` is a command-line utility inspired by `shadcn` that streamlines the integration of ContextVM (CVM) servers into your TypeScript projects. It generates a type-safe client from a CVM server's tool definitions, allowing you to call CVM tools as if they were native TypeScript functions.

## Quickstart

1. **Install dependencies**

   ```bash
   npm install @contextvm/sdk
   # or
   bun add @contextvm/sdk
   ```

2. **Initialize your project**

   ```bash
   npx @contextvm/ctxcn init
   ```

3. **Add a CVM server client**
   ```bash
   npx @contextvm/ctxcn add <pubkey>
   ```

## Installation

### Global Installation

```bash
npm install -g @contextvm/ctxcn
```

### Local Installation

```bash
npm install --save-dev @contextvm/ctxcn
```

### Development Installation

```bash
git clone https://github.com/your-username/ctxcn.git
cd ctxcn
bun install
```

## Usage

The `ctxcn` utility provides four main commands: `init`, `add`, `update`, and `help`.

### `init`

Initialize your project with a `ctxcn.config.json` file:

```bash
npx @contextvm/ctxcn init
```

This will start an interactive process to configure your project settings.

### `add`

Generate a TypeScript client from a CVM server's tool definitions:

```bash
npx @contextvm/ctxcn add <pubkey>
```

This will:

1. Connect to the specified CVM server
2. Display server information and available tools
3. Allow you to customize the client name
4. Provide options to:
   - Generate and save the client file
   - Print the generated code to console only
   - Cancel the operation

### `update`

Refresh existing CVM server clients with the latest tool definitions:

```bash
# Update a specific client
npx @contextvm/ctxcn update <pubkey>

# Update all clients or select from a list
npx @contextvm/ctxcn update
```

### `help`

Display help information:

```bash
npx @contextvm/ctxcn help
```

## Configuration

The `ctxcn` utility can be configured via a `ctxcn.config.json` file in your project's root directory:

- `source`: The source directory for the generated client.
- `relays`: An array of relays to use when connecting to CVM servers.
- `privateKey`: The private key to use when connecting to CVM servers. This will be used as a fallback if the `CTXCN_PRIVATE_KEY` environment variable is not set.
- `addedClients`: An array of public keys of the clients that have been added. This is automatically managed by the CLI.

### Environment Variables

For better security, you can use environment variables instead of storing private keys in your configuration file:

```bash
# Set your private key as an environment variable
export CTXCN_PRIVATE_KEY="your-private-key-here"
```

### Logging

The CLI sets the ContextVM SDK logger to a minimal level by default to reduce noisy output during operations (for example when running [`src/commands/add.ts`](src/commands/add.ts:1)). By default the CLI will set `LOG_LEVEL=error` unless you explicitly provide a different value.

You can override the logging behavior with the following environment variables supported by the SDK:

- `LOG_LEVEL` — Minimum log level: `debug`, `info`, `warn`, `error`. Default used by the CLI: `error`.
- `LOG_DESTINATION` — Destination for logs: `stderr` (default), `stdout`, or `file`.
- `LOG_FILE` — Path to the log file when `LOG_DESTINATION=file`.
- `LOG_ENABLED` — Enable or disable logging: `true` (default) or `false`.

Examples:

```bash
# Run the add command with verbose debug logs
LOG_LEVEL=debug npx @contextvm/ctxcn add <pubkey>

# Log to a file instead of the console
LOG_DESTINATION=file LOG_FILE=./app.log npx @contextvm/ctxcn add <pubkey>

# Disable SDK logging entirely
LOG_ENABLED=false npx @contextvm/ctxcn add <pubkey>
```

The generated clients use the following order of precedence for private keys:

1. Private key passed directly in the constructor options
2. `CTXCN_PRIVATE_KEY` environment variable
3. Private key from the configuration file (as a fallback)

## Example

Here is an example of how to use the generated client:

### Using the Singleton Instance (Recommended)

The generated client exports a singleton instance for convenience. The instance is named using camelCase of the server name to avoid collisions:

```typescript
import { addition } from "./src/ctxcn/AdditionClient.ts";

// The singleton uses the default configuration
const result = await addition.add(5, 10);

console.log(result.result); // 15

await addition.disconnect();
```

### Creating a Custom Instance

You can also create your own instance with custom configuration:

```typescript
import { AdditionClient } from "./src/ctxcn/AdditionClient.ts";

// The client will automatically use the CTXCN_PRIVATE_KEY environment variable
// or the private key from the configuration file
const mcpClient = new AdditionClient();

const result = await mcpClient.add(5, 10);

console.log(result.result); // 15

await mcpClient.disconnect();
```

### Override Configuration

You can override the private key and relays when creating a client instance:

```typescript
import { AdditionClient } from "./src/ctxcn/AdditionClient.ts";

const mcpClient = new AdditionClient({
  privateKey: "your-custom-private-key",
  relays: ["wss://your-custom-relay.org"],
});

const result = await mcpClient.add(5, 10);

console.log(result.result); // 15

await mcpClient.disconnect();
```
