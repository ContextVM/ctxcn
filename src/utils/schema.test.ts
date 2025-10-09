import { test, expect } from "bun:test";
import { generateClientCode } from "./schema";

// Mock tool data with various naming patterns
const mockTools = [
  {
    name: "add-user",
    description: "Add a new user",
    inputSchema: {
      type: "object",
      properties: {
        pubkey: { type: "string", description: "User's public key" },
        relays: { type: "array", items: { type: "string" } },
      },
      required: ["pubkey"],
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        user: {
          type: "object",
          properties: {
            pubkey: { type: "string" },
            relays: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  {
    name: "delete_user_data",
    description: "Delete user data",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
      },
      required: ["userId"],
    },
    outputSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  },
  {
    name: "get-user-info",
    description: "Get user information",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    outputSchema: {
      type: "object",
      properties: {
        user: { type: "object" },
      },
    },
  },
  {
    name: "simple",
    description: "A simple tool",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        result: { type: "string" },
      },
    },
  },
];

const mockToolListResult = {
  tools: mockTools,
};

test("generateClientCode converts hyphenated tool names to PascalCase", async () => {
  const pubkey = "test-pubkey";
  const serverName = "TestServer";

  const clientCode = await generateClientCode(
    pubkey,
    mockToolListResult,
    serverName,
  );

  // Check that the generated code contains PascalCase method names
  expect(clientCode).toContain("async AddUser(");
  expect(clientCode).toContain("async DeleteUserData(");
  expect(clientCode).toContain("async GetUserInfo(");
  expect(clientCode).toContain("async Simple(");

  // Check that the original tool names are used in the call method
  expect(clientCode).toContain('return this.call("add-user"');
  expect(clientCode).toContain('return this.call("delete_user_data"');
  expect(clientCode).toContain('return this.call("get-user-info"');
  expect(clientCode).toContain('return this.call("simple"');

  // Check that the server type uses PascalCase
  expect(clientCode).toContain("AddUser:");
  expect(clientCode).toContain("DeleteUserData:");
  expect(clientCode).toContain("GetUserInfo:");
  expect(clientCode).toContain("Simple:");
});

test("generateClientCode creates valid TypeScript syntax", async () => {
  const pubkey = "test-pubkey";
  const serverName = "TestServer";

  const clientCode = await generateClientCode(
    pubkey,
    mockToolListResult,
    serverName,
  );

  // Check that the generated code doesn't contain invalid syntax patterns
  // Methods with hyphens would be invalid TypeScript
  expect(clientCode).not.toContain("async add-user(");
  expect(clientCode).not.toContain("async delete_user_data(");
  expect(clientCode).not.toContain("async get-user-info(");

  // Check that the code contains proper TypeScript syntax
  expect(clientCode).toContain("export class TestServerClient");
  expect(clientCode).toContain("implements TestServer");
  expect(clientCode).toContain("async disconnect(): Promise<void>");
});

test("generateClientCode handles tools with no parameters", async () => {
  const noParamTool = {
    name: "no-params-tool",
    description: "Tool with no parameters",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        result: { type: "string" },
      },
    },
  };

  const mockToolList = {
    tools: [noParamTool],
  };

  const clientCode = await generateClientCode(
    "test-pubkey",
    mockToolList,
    "TestServer",
  );

  // Check that the method is generated with PascalCase name
  expect(clientCode).toContain("async NoParamsTool(");
  expect(clientCode).toContain('return this.call("no-params-tool"');
});
