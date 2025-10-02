import { promises as fs } from "fs";
import path from "path";

export interface Config {
  source: string;
  relays: string[];
  privateKey?: string;
}

export const DEFAULT_CONFIG: Config = {
  source: "src/ctxcn",
  relays: ["ws://localhost:10547"],
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

    return config;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}
