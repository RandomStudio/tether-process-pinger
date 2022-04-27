import { Config } from "./types";

const defaults: Config = {
  targetAppName: "unknown",
  tether: {
    host: "localhost",
    clientId: 'mqttjs_' + Math.random().toString(16).substring(2, 10),
  },
  ping: {
    interval: 15 * 1000,
    timeout: 5 * 1000,
  },
  pm2: {
    enabled: true,
    processName: "unknown",
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
