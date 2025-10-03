export function handleHelp() {
  console.log(`
  Usage: npx @contextvm/ctxcn <command> [options]

  Commands:
    init      Initialize a new project and create a ctxcn.config.json file.
    add       Add a new CVM server client to your project.
    update    Update existing CVM server clients with the latest tool definitions.
    help      Display this help message.

  Options:
    --help    Display help for a specific command.
  `);
}
