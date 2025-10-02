import type { JSONSchema } from "json-schema-to-typescript/dist/src/types/JSONSchema";
import { compile } from "json-schema-to-typescript";

export function sanitizeSchema(schema: unknown): object | boolean {
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

export function extractInlineType(typeDefinition: string): string {
  // Extract the actual type definition from a generated type
  // Handle both interface and type definitions
  const interfaceMatch = typeDefinition.match(
    /export interface \w+ ([\s\S]*?)(?=export|\s*$)/,
  );
  if (interfaceMatch && interfaceMatch[1]) {
    return formatInlineType(interfaceMatch[1]);
  }

  const typeMatch = typeDefinition.match(/export type \w+ = ([\s\S]*?);/);
  if (typeMatch && typeMatch[1]) {
    const shape = typeMatch[1].trim();
    return shape === "unknown" ? "{}" : formatInlineType(shape);
  }

  return "{}";
}

function formatInlineType(typeShape: string): string {
  // If it's an object type, clean up the formatting
  if (typeShape.startsWith("{") && typeShape.endsWith("}")) {
    const objectContent = typeShape.slice(1, -1).trim();
    if (objectContent) {
      const properties = objectContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => `      ${line}`)
        .join("\n");
      return `{\n${properties}\n    }`;
    }
    return "{}";
  }
  return typeShape;
}

export function extractSchemaProperties(
  schema: JSONSchema,
): Array<{ name: string; type: string; required: boolean }> {
  if (!schema?.properties || typeof schema !== "object") {
    return [];
  }

  const required = Array.isArray(schema.required) ? schema.required : [];

  return Object.entries(schema.properties)
    .filter(([_, propSchema]) => propSchema && typeof propSchema === "object")
    .map(([propName, propSchema]) => {
      const propType = (propSchema as any).type || "unknown";
      const isRequired = required.includes(propName);

      return {
        name: propName,
        type: mapJsonTypeToTypeScript(propType),
        required: isRequired,
      };
    });
}

function mapJsonTypeToTypeScript(jsonType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    integer: "number",
    boolean: "boolean",
    array: "any[]",
    object: "object",
  };

  return typeMap[jsonType] || "any";
}

export async function generateTypeFromSchema(
  schema: JSONSchema | boolean,
  typeName: string,
): Promise<string> {
  if (typeof schema === "boolean") {
    return `export type ${typeName} = ${schema ? "any" : "never"};`;
  }

  const sanitizedSchema = sanitizeSchema(schema);

  if (typeof sanitizedSchema === "boolean") {
    return `export type ${typeName} = ${sanitizedSchema ? "any" : "never"};`;
  }

  return await compile(sanitizedSchema, typeName, {
    bannerComment: "",
    additionalProperties: false,
  });
}

export async function generateClientCode(
  pubkey: string,
  serverDetails: any,
  toolListResult: any,
  serverName: string,
): Promise<string> {
  const classMethods: string[] = [];
  const serverTypeMethods: string[] = [];

  for (const tool of toolListResult.tools) {
    const { methodDefinitions, serverMethod } = await generateToolMethods(
      tool,
      serverName,
    );

    classMethods.push(methodDefinitions.classMethod);
    serverTypeMethods.push(serverMethod);
  }

  const clientName = `${serverName}Client`;
  const serverType = generateServerType(serverName, serverTypeMethods);
  const genericCallMethod = generateGenericCallMethod();

  return assembleClientCode(
    clientName,
    pubkey,
    serverType,
    genericCallMethod,
    classMethods,
    serverName,
  );
}

async function generateToolMethods(tool: any, serverName: string) {
  const toolName = tool.name;
  const capitalizedToolName = toPascalCase(tool.name);
  const inputTypeName = `${capitalizedToolName}Input`;
  const outputTypeName = `${capitalizedToolName}Output`;

  // Generate types temporarily to extract inline definitions
  const inputType = await generateTypeFromSchema(
    tool.inputSchema,
    inputTypeName,
  );
  const outputType = await generateTypeFromSchema(
    tool.outputSchema,
    outputTypeName,
  );

  // Extract inline type definitions for better IDE inference
  const inputInlineType = extractInlineType(inputType);
  const outputInlineType = extractInlineType(outputType);

  // Extract properties from schema for individual parameters
  const inputProperties = extractSchemaProperties(tool.inputSchema);

  // Generate method with individual parameters for better developer experience
  const methodDefinitions =
    inputProperties.length > 0
      ? generateMethodWithIndividualParams(
          toolName,
          inputProperties,
          outputInlineType,
        )
      : generateMethodWithObjectParam(
          toolName,
          inputInlineType,
          outputInlineType,
        );

  // Add corresponding method signature to server type
  const serverMethod =
    inputProperties.length > 0
      ? `  ${toolName}: (${methodDefinitions.parameters}) => Promise<${outputInlineType}>;`
      : `  ${toolName}: (args: ${inputInlineType}) => Promise<${outputInlineType}>;`;

  return { methodDefinitions, serverMethod };
}

function toPascalCase(str: string): string {
  return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
}

function generateMethodWithIndividualParams(
  toolName: string,
  properties: Array<{ name: string; type: string; required: boolean }>,
  outputType: string,
) {
  const parameters = properties
    .map((prop) => `${prop.name}${prop.required ? "" : "?"}: ${prop.type}`)
    .join(", ");
  const argsObject = properties.map((prop) => prop.name).join(", ");

  return {
    parameters,
    classMethod: `
  async ${toolName}(
    ${parameters}
  ): Promise<${outputType}> {
    return this.call("${toolName}", { ${argsObject} });
  }`,
  };
}

function generateMethodWithObjectParam(
  toolName: string,
  inputType: string,
  outputType: string,
) {
  return {
    parameters: `args: ${inputType}`,
    classMethod: `
  async ${toolName}(
    args: ${inputType}
  ): Promise<${outputType}> {
    return this.call("${toolName}", args);
  }`,
  };
}

function generateServerType(
  serverName: string,
  serverTypeMethods: string[],
): string {
  return `export type ${serverName} = {
${serverTypeMethods.join("\n")}
};`;
}

function generateGenericCallMethod(): string {
  return `  private async call(
    name: string,
    args: any
  ): Promise<any> {
    const result = await this.client.callTool({
      name,
      arguments: { ...args },
    });
    return result.structuredContent;
  }`;
}

function assembleClientCode(
  clientName: string,
  pubkey: string,
  serverType: string,
  genericCallMethod: string,
  classMethods: string[],
  serverName: string,
): string {
  return `import { Client } from "@modelcontextprotocol/sdk/client";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  NostrClientTransport,
  type NostrTransportOptions,
  PrivateKeySigner,
  ApplesauceRelayPool,
} from "@contextvm/sdk";

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
}
