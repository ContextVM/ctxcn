import { readdir } from "fs/promises";
import path from "path";
import { toPascalCase } from "../utils.js";
import { loadConfig } from "../config.js";
import { askQuestion, askYesNo, closeReadlineInterface } from "../utils/cli.js";
import { generateClientCode } from "../utils/schema.js";
import { createCvmConnection } from "../utils/cvm-client.js";
import { fileExists, writeFileWithDir } from "../utils/file-operations.js";
import { handleConfigError, handleCliError } from "../utils/error-handler.js";

async function findExistingClientFile(
  cwd: string,
  sourceDir: string,
): Promise<string | null> {
  const outputDir = path.join(cwd, sourceDir);
  if (!(await fileExists(outputDir))) {
    return null;
  }

  try {
    const existingFiles = await readdir(outputDir);
    const existingClientFile = existingFiles.find(
      (file: string) => file.endsWith(".ts") && file.includes("Client"),
    );
    return existingClientFile || null;
  } catch (error) {
    return null;
  }
}

export async function handleUpdate(cwd: string, pubkey?: string) {
  console.log("🔍 Checking for configuration file...");

  // Check if config file exists
  const configPath = path.join(cwd, "ctxcn.config.json");
  if (!(await fileExists(configPath))) {
    closeReadlineInterface();
    handleConfigError();
  }

  const config = await loadConfig(cwd);

  if (!config.addedClients || config.addedClients.length === 0) {
    console.log(
      "ℹ️ No clients have been added yet. Use 'ctxcn add <pubkey>' to add a client.",
    );
    closeReadlineInterface();
    process.exit(0);
  }

  let targetPubkey: string;

  if (pubkey) {
    if (!config.addedClients.includes(pubkey)) {
      console.log(
        `❌ Client with pubkey ${pubkey} is not in the list of added clients.`,
      );
      console.log("Added clients:");
      config.addedClients.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p}`);
      });
      closeReadlineInterface();
      process.exit(1);
    }
    targetPubkey = pubkey;
  } else {
    // Show list of added clients and let user choose
    console.log("\n📋 Added Clients:");
    config.addedClients.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p}`);
    });

    const choice = await askQuestion(
      "Enter the number of the client to update (or 'all' to update all)",
      "1",
    );

    if (choice.toLowerCase() === "all") {
      // Update all clients
      console.log("🔄 Updating all clients...");
      for (const clientPubkey of config.addedClients) {
        await updateSingleClient(cwd, config, clientPubkey);
      }
      console.log("✅ All clients updated successfully.");
      closeReadlineInterface();
      process.exit(0);
    } else {
      const index = parseInt(choice) - 1;
      if (index < 0 || index >= config.addedClients.length) {
        console.error("❌ Invalid selection.");
        closeReadlineInterface();
        process.exit(1);
      }
      targetPubkey = config.addedClients[index]!;
    }
  }

  await updateSingleClient(cwd, config, targetPubkey);
  closeReadlineInterface();
  process.exit(0);
}

async function updateSingleClient(cwd: string, config: any, pubkey: string) {
  console.log(`\n🔄 Updating client ${pubkey}...`);

  try {
    const { serverDetails, toolListResult } = await createCvmConnection(
      pubkey,
      config,
      "update-client",
    );

    const newServerName = toPascalCase(serverDetails?.name || "UnknownServer");

    // Check if there's an existing client file to determine the old name
    const existingClientFile = await findExistingClientFile(cwd, config.source);

    let oldServerName: string | null = null;
    if (existingClientFile) {
      // Extract the server name from the existing file
      oldServerName = existingClientFile.replace("Client.ts", "");
    }

    let serverName = newServerName;

    // Check if server name has changed
    if (oldServerName && oldServerName !== newServerName) {
      console.log(
        `\n⚠️ Server name has changed from '${oldServerName}' to '${newServerName}'.`,
      );
      const useNewName = await askYesNo(
        "Do you want to use the new server name?",
        false,
      );

      if (!useNewName) {
        serverName = oldServerName;
        console.log(`Keeping the old server name: ${serverName}`);
      } else {
        console.log(`Using the new server name: ${serverName}`);
      }
    }

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

    const confirm = await askYesNo("Do you want to update this client?", true);

    if (!confirm) {
      console.log("❌ Update cancelled.");
      return;
    }

    const clientCode = await generateClientCode(
      pubkey,
      toolListResult,
      serverName,
      config.privateKey,
      config.relays,
    );
    const clientName = `${serverName}Client`;

    const outputPath = path.join(cwd, config.source, `${clientName}.ts`);
    await writeFileWithDir(outputPath, clientCode);

    console.log(`✅ Updated client for ${serverName} at ${outputPath}`);
  } catch (error) {
    handleCliError(error, `updating client ${pubkey}`);
  }
}
