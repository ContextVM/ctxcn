import type { JSONSchema } from "json-schema-to-typescript";
import { compile } from "json-schema-to-typescript";
import { toPascalCase } from "../utils.js";

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

export function resolveSchemaRefs(schema: any, rootSchema?: any): any {
  if (!rootSchema) {
    rootSchema = schema;
  }

  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => resolveSchemaRefs(item, rootSchema));
  }

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (refPath.startsWith("#/")) {
      // Resolve internal reference
      const pathParts = refPath.substring(2).split("/");
      let resolved: any = rootSchema;

      for (const part of pathParts) {
        if (resolved && typeof resolved === "object" && part in resolved) {
          resolved = resolved[part];
        } else {
          // If we can't resolve the path, return the original schema
          return schema;
        }
      }

      // Recursively resolve references in the resolved schema
      return resolveSchemaRefs(resolved, rootSchema);
    }
  }

  // Recursively process all properties
  const resolved: any = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      resolved[key] = resolveSchemaRefs(schema[key], rootSchema);
    }
  }

  return resolved;
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
      const lines = objectContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      let indentLevel = 1;
      const formattedLines = lines.map((line) => {
        // Calculate indentation based on braces
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;

        // Decrease indent before lines that close more than they open
        if (closeBraces > openBraces) {
          indentLevel = Math.max(1, indentLevel - (closeBraces - openBraces));
        }

        const indent = "  ".repeat(indentLevel);
        const formattedLine = `${indent}${line}`;

        // Increase indent after lines that open more than they close
        if (openBraces > closeBraces) {
          indentLevel += openBraces - closeBraces;
        }

        return formattedLine;
      });

      return `{\n${formattedLines.join("\n")}\n  }`;
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

  // Check if the schema is an empty object (no properties)
  const schemaObj = sanitizedSchema as any;
  const isEmptyObjectSchema =
    schemaObj.type === "object" &&
    (!schemaObj.properties || Object.keys(schemaObj.properties).length === 0);

  if (isEmptyObjectSchema) {
    // For empty object schemas, use a type alias to Record<string, unknown>
    // This ensures full compatibility while being semantically clear
    return `export type ${typeName} = Record<string, unknown>;\n`;
  }

  // Resolve internal $ref references before compilation
  const resolvedSchema = resolveSchemaRefs(sanitizedSchema);

  const typeDefinition = await compile(resolvedSchema, typeName, {
    bannerComment: "",
    additionalProperties: false,
  });

  return typeDefinition;
}

export async function generateClientCode(
  pubkey: string,
  toolListResult: any,
  serverName: string,
  privateKey?: string,
  relays?: string[],
): Promise<string> {
  const classMethods: string[] = [];
  const serverTypeMethods: string[] = [];
  const typeDefinitions: string[] = [];

  for (const tool of toolListResult.tools) {
    const { methodDefinitions, serverMethod, inputType, outputType } =
      await generateToolMethods(tool, serverName);

    classMethods.push(methodDefinitions.classMethod);
    serverTypeMethods.push(serverMethod);

    // Add type definitions to be placed at the top of the file
    if (inputType) {
      typeDefinitions.push(inputType);
    }
    if (outputType) {
      typeDefinitions.push(outputType);
    }
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
    typeDefinitions,
    privateKey,
    relays,
  );
}

interface ToolInfo {
  originalName: string;
  pascalName: string;
  inputTypeName: string;
  outputTypeName: string;
}

async function generateToolMethods(
  tool: any,
  serverName: string,
): Promise<{
  methodDefinitions: any;
  serverMethod: string;
  inputType?: string;
  outputType?: string;
}> {
  const toolInfo: ToolInfo = {
    originalName: tool.name,
    pascalName: toPascalCase(tool.name),
    inputTypeName: `${toPascalCase(tool.name)}Input`,
    outputTypeName: `${toPascalCase(tool.name)}Output`,
  };

  // Generate types to be used in the client
  const [inputType, outputType] = await Promise.all([
    generateTypeFromSchema(tool.inputSchema, toolInfo.inputTypeName),
    generateTypeFromSchema(tool.outputSchema, toolInfo.outputTypeName),
  ]);

  // Extract inline type definitions for better IDE inference
  const inputInlineType = extractInlineType(inputType);
  const outputInlineType = extractInlineType(outputType);

  // Extract properties from schema for individual parameters
  const inputProperties = extractSchemaProperties(tool.inputSchema);

  // Generate JSDoc comment with the named type
  const jsDocComment = generateJSDoc(
    tool,
    inputProperties,
    toolInfo.outputTypeName,
  );

  // Generate method with individual parameters for better developer experience
  const methodDefinitions =
    inputProperties.length > 0
      ? generateMethodWithIndividualParams(
          toolInfo,
          inputProperties,
          toolInfo.outputTypeName, // Use named type instead of inline type
          jsDocComment,
        )
      : generateMethodWithObjectParam(
          toolInfo,
          toolInfo.inputTypeName, // Use named type instead of inline type
          toolInfo.outputTypeName, // Use named type instead of inline type
          jsDocComment,
        );

  // Add corresponding method signature to server type
  const serverMethod =
    inputProperties.length > 0
      ? `  ${toolInfo.pascalName}: (${methodDefinitions.parameters}) => Promise<${toolInfo.outputTypeName}>;`
      : `  ${toolInfo.pascalName}: (args: ${toolInfo.inputTypeName}) => Promise<${toolInfo.outputTypeName}>;`;

  return { methodDefinitions, serverMethod, inputType, outputType };
}

function generateJSDoc(
  tool: any,
  inputProperties: Array<{ name: string; type: string; required: boolean }>,
  outputTypeName: string,
): string {
  const lines: string[] = [];

  // Add main description
  if (tool.description) {
    lines.push(`   * ${tool.description}`);
  } else {
    lines.push(`   * ${tool.title || tool.name} tool`);
  }

  // Add parameter descriptions
  if (inputProperties.length > 0) {
    // Extract parameter descriptions from input schema if available
    const inputSchema = tool.inputSchema;
    if (inputSchema && inputSchema.properties) {
      for (const prop of inputProperties) {
        const propSchema = inputSchema.properties[prop.name];
        let description = propSchema?.description || "";

        // If no description is available, create a default one based on the parameter name
        if (!description) {
          description = generateParameterDescription(prop.name, tool.name);
        }

        const optional = prop.required ? "" : "[optional] ";
        lines.push(
          `   * @param {${prop.type}} ${prop.name} ${optional}${description}`,
        );
      }
    }
  }

  // Add return type description with the named type
  const outputSchema = tool.outputSchema;
  const returnDescription =
    outputSchema?.description || `The result of the ${tool.name} operation`;

  lines.push(`   * @returns {Promise<${outputTypeName}>} ${returnDescription}`);

  return `  /**\n${lines.join("\n")}\n   */`;
}

function generateParameterDescription(
  paramName: string,
  toolName: string,
): string {
  // Generate a meaningful description based on the parameter name and tool context
  const paramDescriptions: Record<string, string> = {
    a: "The first number to add",
    b: "The second number to add",
    input: "The input value to be echoed",
    text: "The text to process",
    value: "The value to use",
    data: "The data to process",
    options: "Configuration options",
    config: "Configuration settings",
    url: "The URL to connect to",
    path: "The file or directory path",
    name: "The name identifier",
    id: "The unique identifier",
  };

  // Check if we have a predefined description
  if (paramDescriptions[paramName]) {
    return paramDescriptions[paramName];
  }

  // Generate a generic description based on the parameter name
  const capitalizedParam =
    paramName.charAt(0).toUpperCase() + paramName.slice(1);
  return `The ${paramName.replace(/([A-Z])/g, " $1").toLowerCase()} parameter`;
}

function generateMethodWithIndividualParams(
  toolInfo: ToolInfo,
  properties: Array<{ name: string; type: string; required: boolean }>,
  outputTypeName: string,
  jsDocComment: string,
) {
  const parameters = properties
    .map((prop) => `${prop.name}${prop.required ? "" : "?"}: ${prop.type}`)
    .join(", ");
  const argsObject = properties.map((prop) => prop.name).join(", ");

  return {
    parameters,
    classMethod: `  ${jsDocComment}
  async ${toolInfo.pascalName}(
    ${parameters}
  ): Promise<${outputTypeName}> {
    return this.call("${toolInfo.originalName}", { ${argsObject} });
  }`,
  };
}

function generateMethodWithObjectParam(
  toolInfo: ToolInfo,
  inputTypeName: string,
  outputTypeName: string,
  jsDocComment: string,
) {
  return {
    parameters: `args: ${inputTypeName}`,
    classMethod: `  ${jsDocComment}
  async ${toolInfo.pascalName}(
    args: ${inputTypeName}
  ): Promise<${outputTypeName}> {
    return this.call("${toolInfo.originalName}", args);
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
  return `  private async call<T = unknown>(
    name: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const result = await this.client.callTool({
      name,
      arguments: { ...args },
    });
    return result.structuredContent as T;
  }`;
}

function assembleClientCode(
  clientName: string,
  pubkey: string,
  serverType: string,
  genericCallMethod: string,
  classMethods: string[],
  serverName: string,
  typeDefinitions: string[],
  privateKey?: string,
  relays?: string[],
): string {
  return `import { Client } from "@modelcontextprotocol/sdk/client";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  NostrClientTransport,
  type NostrTransportOptions,
  PrivateKeySigner,
  ApplesauceRelayPool,
} from "@contextvm/sdk";

${typeDefinitions.join("\n\n")}

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
      relays = ${relays ? JSON.stringify(relays) : `["wss://relay.contextvm.org"]`},
      signer = new PrivateKeySigner(privateKey || ""),
      relayHandler = new ApplesauceRelayPool(relays),
      ...rest
    } = options;

    this.transport = new NostrClientTransport({
      serverPubkey: ${clientName}.SERVER_PUBKEY,
      signer,
      relayHandler,
      isStateless: true,
      ...rest,
    });

    // Auto-connect in constructor
    this.client.connect(this.transport).catch((error) => {
      console.error(\`Failed to connect to server: \${error}\`);
    });
  }

  async disconnect(): Promise<void> {
    await this.transport.close();
  }

${genericCallMethod}

${classMethods.join("\n\n")}
}

/**
 * Default singleton instance of ${clientName}.
 * This instance uses the default configuration and can be used directly
 * without creating a new instance.
 *
 * @example
 * import { client } from './${clientName}';
 * const result = await client.SomeMethod();
 */
export const client = new ${clientName}();
`;
}
