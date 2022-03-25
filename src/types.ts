import { IClientOptions } from "@tether/tether-agent";
import { ProcessDescription } from "pm2";

export interface Config {
  loglevel: string;
  tether: IClientOptions;
  targetAppName: string;
  ping: {
    interval: number;
    timeout: number;
    tetherAgentId?: string;
  };
  pm2: {
    enabled: boolean;
    processName: string;
  };
  datadog: {
    enabled: boolean;
    globalTags: string[];
    decodeStats: boolean;
  };
  exitPause: number;
}

export interface State {
  lastPingSentTime: number | null;
  targetProcess: ProcessDescription | null;
}
