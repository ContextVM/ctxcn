export function handleHelp() {
  console.log(`
  Usage: ctxcn <command> [options]

  Commands:
    init      Initialize a new project and create a ctxcn.config.json file.
    add       Add a new CVM server client to your project.
    help      Display this help message.

  Options:
    --help    Display help for a specific command.
  `);
}
