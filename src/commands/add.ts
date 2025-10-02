import { Client } from "@modelcontextprotocol/sdk/client";
import { compile } from "json-schema-to-typescript";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { JSONSchema } from "json-schema-to-typescript/dist/src/types/JSONSchema";
import { toPascalCase } from "../utils";
import { loadConfig } from "../config";
import {
  ApplesauceRelayPool,
  NostrClientTransport,
  PrivateKeySigner,
} from "@contextvm/sdk";

function sanitizeSchema(schema: unknown): object | boolean {
  // A valid JSON Schema is a boolean or an object.
  if (typeof schema === "boolean") {
    return schema;
  }

  // If it's not an object (e.g., string, null, number, array), it's invalid. Return empty schema.
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return {};
  }

  // It's an object, so we'll traverse it to remove invalid $refs.
  function traverse(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(traverse);
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === "$ref") {
          const refValue = obj[key];
          // Only keep internal references.
          if (typeof refValue === "string" && refValue.startsWith("#")) {
            newObj[key] = refValue;
          }
        } else {
          newObj[key] = traverse(obj[key]);
        }
      }
    }
    return newObj;
  }

  return traverse(schema);
}

function getTypeShape(fullType: string): string {
  const match = fullType.match(/=\s*([\s\S]*);/);
  if (match && match[1]) {
    const shape = match[1].trim();
    if (shape === "unknown") {
      return "{}";
    }
    return shape;
  }
  return "{}";
}

export async function handleAdd(pubkey: string, cwd: string) {
  const config = await loadConfig(cwd);

  const client = new Client({
    name: `generator-client`,
    version: "1.0.0",
  });

  const transport = new NostrClientTransport({
    signer: new PrivateKeySigner(config.privateKey),
    relayHandler: new ApplesauceRelayPool(config.relays),
    serverPubkey: pubkey,
    // isStateless: true,
  });

  await client.connect(transport);
  const serverDetails = client.getServerVersion();
  const toolListResult = await client.listTools();
  await transport.close();

  const apiMethods: string[] = [];
  const classMethods: string[] = [];
  const serverName = toPascalCase(serverDetails?.name || "UnknownServer");

  for (const tool of toolListResult.tools) {
    const toolName = tool.name;
    const capitalizedToolName = toPascalCase(toolName);

    const inputTypeName = `${capitalizedToolName}Input`;
    const outputTypeName = `${capitalizedToolName}Output`;

    const inputSchema = tool.inputSchema as JSONSchema;
    const outputSchema = tool.outputSchema as JSONSchema;

    const sanitizedInputSchema = sanitizeSchema(inputSchema);
    const sanitizedOutputSchema = sanitizeSchema(outputSchema);

    let inputType: string;
    if (typeof sanitizedInputSchema === "boolean") {
      inputType = `export type ${inputTypeName} = ${
        sanitizedInputSchema ? "any" : "never"
      };`;
    } else {
      inputType = await compile(sanitizedInputSchema, inputTypeName, {
        bannerComment: "",
        additionalProperties: false,
      });
    }

    let outputType: string;
    if (typeof sanitizedOutputSchema === "boolean") {
      outputType = `export type ${outputTypeName} = ${
        sanitizedOutputSchema ? "any" : "never"
      };`;
    } else {
      outputType = await compile(sanitizedOutputSchema, outputTypeName, {
        bannerComment: "",
        additionalProperties: false,
      });
    }

    const inputShape = getTypeShape(inputType);
    const outputShape = getTypeShape(outputType);

    apiMethods.push(`
    ${toolName}: {
      input: ${inputShape};
      output: ${outputShape};
    };`);

    classMethods.push(`
  async ${toolName}(
    args: ${serverName}API["${toolName}"]["input"]
  ): Promise<${serverName}API["${toolName}"]["output"]> {
    return this.call("${toolName}", args);
  }`);
  }

  const clientName = `${serverName}Client`;

  const apiType = `export type ${serverName}API = {${apiMethods.join("")}};`;

  const serverType = `
export type ${serverName} = {
  [K in keyof ${serverName}API]: (
    args: ${serverName}API[K]["input"]
  ) => Promise<${serverName}API[K]["output"]>;
};
`;

  const genericCallMethod = `
  private async call<T extends keyof ${serverName}API>(
    name: T,
    args: ${serverName}API[T]["input"]
  ): Promise<${serverName}API[T]["output"]> {
    const result = await this.client.callTool({
      name: name as string,
      arguments: { ...args },
    });
    return result.structuredContent as ${serverName}API[T]["output"];
  }
`;

  const clientCode = `
import { Client } from "@modelcontextprotocol/sdk/client";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  NostrClientTransport,
  type NostrTransportOptions,
  PrivateKeySigner,
  ApplesauceRelayPool,
} from "@contextvm/sdk";

${apiType}
${serverType}

export class ${clientName} implements ${serverName} {
  static readonly SERVER_PUBKEY = "${pubkey}";
  private client: Client;
  private transport: Transport;

  constructor(
    options: Partial<NostrTransportOptions> & { privateKey?: string; relays?: string[] } = {}
  ) {
    this.client = new Client({
      name: "${clientName}",
      version: "1.0.0",
    });

    const {
      privateKey,
      relays = ["ws://localhost:10547"],
      signer = new PrivateKeySigner(privateKey),
      relayHandler = new ApplesauceRelayPool(relays),
      ...rest
    } = options;

    this.transport = new NostrClientTransport({
      serverPubkey: ${clientName}.SERVER_PUBKEY,
      signer,
      relayHandler,
      ...rest,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
  }
${genericCallMethod}
${classMethods.join("\n")}
}
`;

  const outputDir = path.join(cwd, config.source);
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${clientName}.ts`);
  await writeFile(outputPath, clientCode);

  console.log(`Generated client for ${serverName} at ${outputPath}`);
  process.exit(0);
}
