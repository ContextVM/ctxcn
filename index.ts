#!/usr/bin/env node
import { handleInit } from "./src/commands/init.js";
import { handleAdd } from "./src/commands/add.js";
import { handleUpdate } from "./src/commands/update.js";
import { handleHelp } from "./src/commands/help.js";

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
      handleHelp();
      return;
    }

    switch (command) {
      case "init":
        await handleInit(process.cwd());
        break;
      case "add":
        const pubkey = args[1];
        if (!pubkey) {
          console.error("Error: Missing pubkey for 'add' command.");
          console.error("Usage: ctxcn add <pubkey>");
          process.exit(1);
        }
        await handleAdd(pubkey, process.cwd());
        break;
      case "update":
        const updatePubkey = args[1];
        await handleUpdate(process.cwd(), updatePubkey);
        break;
      case "help":
        handleHelp();
        break;
      default:
        console.error(`Error: Unknown command '${command}'`);
        handleHelp();
        process.exit(1);
        break;
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
  }
}

main();
