import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CONFIG, type Config } from "../config";
import { askQuestion, closeReadlineInterface } from "../utils/cli";

export async function handleInit(cwd: string) {
  console.log("🚀 Initializing project for ctxcn...");

  console.log("\n🔍 Verifying project structure...");
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    await fs.access(packageJsonPath);
    console.log("✔️ Project structure seems valid (package.json found).");
  } catch (error) {
    console.error(
      "❌ Error: No package.json found. Please run this command in a valid project root directory.",
    );
    process.exit(1);
  }

  const configPath = path.join(cwd, "ctxcn.config.json");
  try {
    await fs.access(configPath);
    const overwrite = await askQuestion(
      "A `ctxcn.config.json` file already exists. Do you want to overwrite it?",
      "n",
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log(
        "Aborting initialization. Your existing configuration is safe.",
      );
      process.exit(0);
    }
  } catch (error) {
    // Config file doesn't exist, so we can proceed.
  }

  console.log("\n⚙️ Please provide your configuration details:");
  const source = await askQuestion(
    "Enter the source directory for generated clients",
    DEFAULT_CONFIG.source,
  );
  const relaysStr = await askQuestion(
    "Enter the relays to connect to (comma-separated)",
    DEFAULT_CONFIG.relays.join(", "),
  );
  const relays = relaysStr.split(",").map((r) => r.trim());

  closeReadlineInterface();

  const config: Config = {
    source,
    relays,
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(
    "\n✔️ Configuration file `ctxcn.config.json` created successfully.",
  );

  const sourceDir = path.join(cwd, config.source);
  try {
    await fs.access(sourceDir);
  } catch (error) {
    await fs.mkdir(sourceDir, { recursive: true });
    console.log(`✔️ Source directory \`${config.source}\` created.`);
  }

  console.log("\n📦 Checking for required dependencies...");
  const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  if (!dependencies["@contextvm/sdk"] && !devDependencies["@contextvm/sdk"]) {
    console.warn(
      "⚠️ The `@contextvm/sdk` dependency is not found in your `package.json`. Please install it to ensure the generated client works correctly.",
    );
  } else {
    console.log("✔️ The `@contextvm/sdk` dependency is already installed.");
  }

  console.log(
    "\n✅ Project initialization complete. You can now use the `add` command.",
  );
}
