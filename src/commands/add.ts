import { Client } from "@modelcontextprotocol/sdk/client";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { toPascalCase } from "../utils.js";
import { loadConfig, saveConfig } from "../config.js";
import { askQuestion, closeReadlineInterface } from "../utils/cli.js";
import { generateClientCode } from "../utils/schema.js";
import {
  ApplesauceRelayPool,
  NostrClientTransport,
  PrivateKeySigner,
} from "@contextvm/sdk";

export async function handleAdd(pubkey: string, cwd: string) {
  console.log("🔍 Checking for configuration file...");

  // Check if config file exists
  const configPath = path.join(cwd, "ctxcn.config.json");
  try {
    await access(configPath);
  } catch (error) {
    console.error(
      "❌ Error: Configuration file 'ctxcn.config.json' not found.",
    );
    console.error(
      "Please run 'ctxcn init' first to create a configuration file.",
    );
    closeReadlineInterface();
    process.exit(1);
  }

  const config = await loadConfig(cwd);

  // Check if client is already added
  if (config.addedClients && config.addedClients.includes(pubkey)) {
    console.log(`⚠️ Client with pubkey ${pubkey} is already added.`);
    console.log("Use 'ctxcn update' to refresh the client if needed.");
    closeReadlineInterface();
    process.exit(0);
  }

  console.log(`🔗 Connecting to server ${pubkey}...`);

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

  try {
    await client.connect(transport);
    const serverDetails = client.getServerVersion();
    const toolListResult = await client.listTools();
    await transport.close();
    let serverName = toPascalCase(serverDetails?.name || "UnknownServer");

    // Interactive confirmation
    console.log(`\n📋 Server Information:`);
    console.log(`   Name: ${serverDetails?.name || "Unknown"}`);
    console.log(`   Version: ${serverDetails?.version || "Unknown"}`);
    console.log(`   Tools found: ${toolListResult.tools.length}`);

    console.log(`\n🔧 Available Tools:`);
    toolListResult.tools.forEach((tool: any, index: number) => {
      console.log(
        `   ${index + 1}. ${tool.name}: ${tool.description || "No description"}`,
      );
    });

    console.log(`\n⚙️ Client Configuration:`);
    console.log(`   Client Name: ${serverName}Client`);
    console.log(`   Output Directory: ${config.source}`);

    // Allow user to change client name
    const customName = await askQuestion(
      "Enter custom client name (leave empty to use default)",
      "",
    );
    if (customName.trim()) {
      serverName = toPascalCase(customName.trim());
    }

    // Confirmation options
    console.log("\n🤔 What would you like to do?");
    console.log("1. Generate and save the client file");
    console.log("2. Print the generated code to console only");
    console.log("3. Cancel");

    const choice = await askQuestion("Choose an option (1-3)", "1");

    if (choice === "3") {
      console.log("❌ Operation cancelled.");
      closeReadlineInterface();
      process.exit(0);
    }

    const printOnly = choice === "2";
    const clientName = `${serverName}Client`;

    const clientCode = await generateClientCode(
      pubkey,
      serverDetails,
      toolListResult,
      serverName,
    );

    if (printOnly) {
      console.log("\n📄 Generated Client Code:");
      console.log("=".repeat(50));
      console.log(clientCode);
      console.log("=".repeat(50));
    } else {
      const outputDir = path.join(cwd, config.source);
      await mkdir(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `${clientName}.ts`);
      await writeFile(outputPath, clientCode);

      // Add the client to the config
      if (!config.addedClients) {
        config.addedClients = [];
      }
      config.addedClients.push(pubkey);
      await saveConfig(cwd, config);

      console.log(`✅ Generated client for ${serverName} at ${outputPath}`);
    }

    closeReadlineInterface();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error connecting to server:", error);
    closeReadlineInterface();
    process.exit(1);
  }
}
