import { IClientOptions } from "@tether/tether-agent";
import { ProcessDescription } from "pm2";

export interface Config {
  loglevel: 'trace'
        | 'debug'
        | 'info'
        | 'warn'
        | 'error'
        | 'silent'; // allow only string values that work with loglevel package
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
