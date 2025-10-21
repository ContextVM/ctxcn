# Ctxcn: Taking Ownership of Your RPC Layer

In today's interconnected digital landscape, building applications often feels like assembling a complex puzzle. We stitch together frontend interfaces, backend logic, and a growing number of remote services, each with its own language and rules. This is especially true in decentralized ecosystems, where the distance between a client application and a remote server can be fraught with friction.

Enter [`ctxcn`](https://github.com/ContextVM/ctxcn), a command-line utility poised to change this narrative. It’s not just another RPC framework; it’s a philosophical shift in how we handle remote integrations. Inspired by the developer-first ethos of tools like `shadcn` and the conceptual elegance of [Cap'n Web](https://blog.cloudflare.com/capnweb-javascript-rpc-library/), `ctxcn` provides a bridge that seamlessly connects your TypeScript applications to ContextVM (CVM) servers, transforming a chore into a natural and intuitive experience.

## The `shadcn` Philosophy: From UI to RPC

To understand `ctxcn`, we first need to understand the brilliance of `shadcn`. Unlike traditional UI libraries that give you black-box components, `shadcn` provides source code that you copy directly into your project. This gives you full ownership. You can modify, adapt, and style every part of the component without fighting against the library's opinions or limitations.

`ctxcn` applies this exact philosophy to the world of server-side RPC. Instead of installing an opaque client package, `ctxcn` generates the client code directly into your codebase. You own it. This simple shift has profound implications: no more dependency hell, no more waiting for a library to be updated, and complete freedom to customize the client to your exact needs.

## Unlocking Creative Freedom

Because you own the client code, `ctxcn` unlocks a new level of creative freedom. Imagine creating multiple "skins" or user interfaces for the same set of server tools. You could build a sleek, minimalist UI for power users and a more guided, friendly experience for beginners, all without touching the backend.

This approach also dramatically simplifies development with AI-powered coding assistants. These tools thrive on clear, well-documented, and strongly-typed code. By generating a client that looks and feels like standard TypeScript, `ctxcn` makes it trivial for an LLM to understand how to implement features that rely on your CVM server, accelerating development and reducing errors.

## The Silent Struggle of Remote Integration

Before `ctxcn`, integrating a CVM server involved a familiar, tedious dance. You’d manually write TypeScript interfaces to match the server's API, a process that was both time-consuming and fragile. You'd find yourself wrestling with `any` types, sacrificing the compile-time safety that makes TypeScript so valuable. Every server update became a potential breaking change, turning maintenance into a source of nightmares.

This friction is the silent tax on innovation. It forces developers to spend more time on boilerplate and configuration than on what truly matters: building a great user experience.

## The `ctxcn` Elegance: From Schema to Seamless Code

`ctxcn` elegantly dismantles these barriers. When you point it at a CVM server, it connects, inspects the tool definitions, and generates a complete, type-safe TypeScript client. This is all accomplished with two simple commands:

```bash
# 1. Initialize ctxcn in your project (one time)
npx @contextvm/ctxcn init

# 2. Add a server by its public key
npx @contextvm/ctxcn add <server-pubkey>

# 3 (optional). Update all clients if the server changes
npx @contextvm/ctxcn update
```

What you get is not just a set of type definitions, but a fully-formed client class. Each remote tool becomes a native TypeScript method, complete with JSDoc comments, parameter validation, and fully-typed return values.

For a live demonstration, check out this short video where we explore ContextVM ecosystem and `ctxcn` in action:

[![Watch the demo](https://blossom.primal.net/db5731558295a9c919327416b8a48e2e189e4ef6603cef636c92f67428a2ae6e.mp4)](https://blossom.primal.net/db5731558295a9c919327416b8a48e2e189e4ef6603cef636c92f67428a2ae6e.mp4)

*(You can also view the [original note here](https://nostr.at/nevent1qvzqqqqqqypzq6ehsrhjjuh885mshp9ru50842dwxjl5z2fcmnaan30k8v3pg9kgqy88wumn8ghj7mn0wvhxcmmv9uq32amnwvaz7tmjv4kxz7fwv3sk6atn9e5k7tcqyrk6hlekvheur59n22ts95vlg9g9d9rm75uk5vk2ksyqj9k73t7fwaa38y4).)*

The complexities of the underlying Nostr transport protocol, message signing, and relay management are all handled for you, abstracted away behind a clean and intuitive API.

For example, if a CVM server exposes an `add` tool, `ctxcn` generates a client you can use like this:

```typescript
// The generated client exports a convenient singleton instance
import { addition } from "./src/ctxcn/AdditionClient";

// This feels like a local function call, but it's a secure, remote operation.
const result = await addition.add(5, 10);

console.log(result.result); // 15

// You can also create a custom instance for more control
import { AdditionClient } from "./src/ctxcn/AdditionClient";
const customClient = new AdditionClient({
  privateKey: process.env.MY_PRIVATE_KEY,
  relays: ["wss://my-custom-relay.com"]
});
```

## Under the Hood: Type Safety via MCP

The type safety in `ctxcn` isn't magic; it's a direct result of the robust design of the **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#structured-content)**. CVM servers adhere to the MCP specification, which allows tools to define their inputs and outputs schemas.

This `outputSchema` is the secret sauce. It enables strict validation of server responses and provides the precise type information `ctxcn` uses to generate a client that is type-safe from end to end. This means you can catch errors at compile time, not in production, leading to more reliable and maintainable applications.

## Get Started and Learn More

`ctxcn` is more than a productivity tool; it's a catalyst for innovation in the decentralized web. By combining the principle of code ownership with the power of a standardized protocol like MCP, it lowers the barrier to entry for CVM integration and champions a future where decentralization and developer experience go hand-in-hand.

The era of wrestling with opaque, third-party RPC clients is over. The future of distributed development is about ownership, flexibility, and powerful, type-safe tooling. Welcome to `ctxcn`.

- **Explore the code** and contribute on the [official `ctxcn` GitHub repository](https://github.com/ContextVM/ctxcn).
- **Dive deeper** into the ContextVM ecosystem by reading the [official documentation](https://docs.contextvm.org).
- **Join the community** on [Nostr](https://nostr.at/npub1dvmcpmefwtnn6dctsj3728n64xhrf06p9yude77echmrkgs5zmyqw33jdm) and [Signal](https://signal.group/#CjQKIOgvfFJf8ZFZ1SsMx7teFqNF73sZ9Elaj_v5i6RSjDHmEhAB3wO1Rg-0gLNdusnb3wLR).