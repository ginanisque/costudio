import { useLocalStorage } from "./useLocalStorage";

export type AppConfig = {
  name: string;
  description?: string;
  abilities?: string[];
};

import rawConfig from "../config/gpt_config.json";

export default function useConfig() {
  const [config, setConfig] = useLocalStorage<AppConfig>("app_config", (rawConfig as AppConfig));
  return { config, setConfig };
}
