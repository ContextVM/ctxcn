import { loadConfig } from "./src/config";
import { handleInit } from "./src/commands/init";
import { handleAdd } from "./src/commands/add";
import { handleUpdate } from "./src/commands/update";
import { handleHelp } from "./src/commands/help";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      await handleInit(process.cwd());
      break;
    case "add":
      const pubkey = args[1];
      if (!pubkey) {
        console.error("Error: Missing pubkey for 'add' command.");
        process.exit(1);
      }
      await handleAdd(pubkey, process.cwd());
      break;
    case "update":
      const updatePubkey = args[1];
      await handleUpdate(process.cwd(), updatePubkey);
      break;
    case "help":
    default:
      handleHelp();
      break;
  }
}

main().catch(console.error);
