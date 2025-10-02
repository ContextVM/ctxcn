# ctxcn

`ctxcn` is a command-line utility inspired by `shadcn` that streamlines the integration of ContextVM (CVM) servers into your TypeScript projects. It generates a type-safe client from a CVM server's tool definitions, allowing you to call CVM tools as if they were native TypeScript functions.

## Overview

The `ctxcn` utility provides the following features:

- **Interactive Project Initialization**: Sets up your project with the necessary configuration to connect to CVM servers through an interactive command-line interface.
- **Code Generation**: Generates a TypeScript client from a CVM server's tool definitions, providing a seamless and type-safe development experience.
- **Configuration**: Allows you to configure the output directory for the generated client, as well as the relays and private key to use when connecting to CVM servers.

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/ctxcn.git
cd ctxcn
bun install
```

## Usage

The `ctxcn` utility provides three main commands: `init`, `add`, and `help`.

### `init`

The `init` command initializes your project with a `ctxcn.config.json` file. This command will guide you through the process of creating the configuration file, asking for the source directory and relays.

To run the `init` command, execute the following command in your project's root directory:

```bash
bun run index.ts init
```

This will start the interactive initialization process.

### `add`

The `add` command generates a TypeScript client from a CVM server's tool definitions. It takes a CVM server's pubkey as an argument.

To run the `add` command, execute the following command in your project's root directory:

```bash
bun run index.ts add <pubkey>
```

This will generate a TypeScript client in the directory specified in your `ctxcn.config.json` file.

### `help`

The `help` command displays a help message with information about the available commands and options.

To run the `help` command, execute the following command:

```bash
bun run index.ts help
```

## Configuration

The `ctxcn` utility can be configured via a `ctxcn.config.json` file in your project's root directory. The following options are available:

- `source`: The source directory for the generated client.
- `relays`: An array of relays to use when connecting to CVM servers.
- `privateKey`: The private key to use when connecting to CVM servers. If not provided, a new private key will be generated on the fly.

## Example

Here is an example of how to use the generated client:

```typescript
import { AdditionClient } from "./src/ctxcn/AdditionClient.ts";
import {
  NostrClientTransport,
  PrivateKeySigner,
  ApplesauceRelayPool,
} from "@contextvm/sdk";

const transport = new NostrClientTransport({
  signer: new PrivateKeySigner(),
  relayHandler: new ApplesauceRelayPool(["ws://localhost:10547"]),
  serverPubkey: "<pubkey>",
  isStateless: true,
});

const mcpClient = new AdditionClient(transport);
await mcpClient.connect();

const result = await mcpClient.add({ a: 5, b: 10 });

console.log(result.result); // 15

await mcpClient.disconnect();
```
