#!/usr/bin/env node
import { handleInit } from "./src/commands/init.js";
import { handleAdd } from "./src/commands/add.js";
import { handleUpdate } from "./src/commands/update.js";
import { handleHelp } from "./src/commands/help.js";
import {
  handleValidationError,
  handleCliError,
} from "./src/utils/error-handler.js";

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
      handleHelp();
      return;
    }

    const cwd = process.cwd();

    switch (command) {
      case "init":
        await handleInit(cwd);
        break;
      case "add":
        const pubkey = args[1];
        if (!pubkey) {
          handleValidationError(
            "Missing pubkey for 'add' command.\nUsage: ctxcn add <pubkey>",
          );
        }
        await handleAdd(pubkey, cwd);
        break;
      case "update":
        const updatePubkey = args[1];
        await handleUpdate(cwd, updatePubkey);
        break;
      case "help":
        handleHelp();
        break;
      default:
        handleValidationError(`Unknown command '${command}'`);
        break;
    }
  } catch (error) {
    handleCliError(error, "main process");
  }
}

main();
