import { promises as fs } from "fs";
import path from "path";

export interface Config {
  source: string;
  relays: string[];
  privateKey?: string;
  addedClients?: string[]; // Array of public keys of added clients
}

export const DEFAULT_CONFIG: Config = {
  source: "src/ctxcn",
  relays: ["ws://localhost:10547"],
  addedClients: [],
};

export async function loadConfig(cwd: string): Promise<Config> {
  const configPath = path.join(cwd, "ctxcn.config.json");
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    const userConfig = JSON.parse(configContent);
    const config = { ...DEFAULT_CONFIG, ...userConfig };

    if (typeof config.source !== "string" || !config.source) {
      config.source = DEFAULT_CONFIG.source;
    }

    // Ensure addedClients is always an array
    if (!config.addedClients || !Array.isArray(config.addedClients)) {
      config.addedClients = [];
    }

    return config;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cwd: string, config: Config): Promise<void> {
  const configPath = path.join(cwd, "ctxcn.config.json");
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
