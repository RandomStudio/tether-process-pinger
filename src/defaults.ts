import { Config } from "./types";

const defaults: Config = {
  tether: {
    host: "localhost",
  },
  ping: {
    interval: 15 * 1000,
    timeout: 5 * 1000,
  },
  pm2: {
    enabled: true,
    processName: "browser",
  },
  datadog: {
    enabled: true,
    globalTags: ["app:TetherProcessPinger"],
    decodeStats: true,
  },
  loglevel: "warn",
  exitPause: 3000,
};

export default defaults;
