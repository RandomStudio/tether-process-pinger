// Third-party modules
import parse from "parse-strings-in-object";
import rc from "rc";
import { getLogger } from "log4js";
import { TetherAgent } from "@tether/tether-agent";
import { StatsD } from "hot-shots";
import pm2Module from "pm2";

// Own modules
import defaults from "./defaults";
import { State } from "./types";
import { decode } from "@msgpack/msgpack";

// Config and logging
const appName = "TetherProcessPinger";
const config: typeof defaults = parse(rc(appName, defaults));
const logger = getLogger(appName);
logger.level = config.loglevel;
logger.info("started with config", config);

// Datadog (optional)
const datadog: StatsD | null = config.datadog.enabled
  ? new StatsD({ globalTags: config.datadog.globalTags })
  : null;

// PM2 (optional)
const pm2: typeof pm2Module | null = config.pm2.enabled ? pm2Module : null;

// Global state object
let state: State = {
  lastPingSentTime: null,
  targetProcess: null,
};

const pauseThenExit = (exitCode: number) => {
  const { exitPause } = config;
  logger.debug(
    `exit requested; wait ${exitPause} then quit with code ${exitCode}...`
  );
  setTimeout(() => {
    process.exit(exitCode);
  }, exitPause);
};

const setupPm2 = () => {
  pm2.connect((err) => {
    if (err) {
      logger.error(
        "PM2 integration enabled, but failed to connect to a PM2 instance:",
        err
      );
      if (datadog) {
        datadog.event(
          "PM2 integration failure",
          "PM2 integration enabled, but failed to connect to a PM2 instance: " +
            err,
          { alert_type: "error" }
        );
      }
      pauseThenExit(1);
    } else {
      logger.info("PM2 integration enabled; connected to PM2 instance OK");
    }

    pm2.list((err, processList) => {
      if (err) {
        logger.error("Error listing processes:", err);
      }
      logger.debug(`Got PM2 process list with ${processList.length} entries: 
        ${processList.map((p) => `${p.pid}: ${p.name}`)}`);

      const targetProcess = processList.find(
        (e) => e.name === config.pm2.processName
      );
      if (targetProcess) {
        logger.info(
          `Found targetProcess ${targetProcess.name} (pid ${targetProcess.pid}) OK`
        );
        state.targetProcess = targetProcess;
      } else {
        logger.error(
          `Failed to find targetProcess "${config.pm2.processName}"`
        );
        pauseThenExit(1);
      }
    });
  });
};

const handleTimeout = (elapsed: number, timeout: number) => {
  logger.error(
    `Too much time elapsed since last ping was sent: ${elapsed} > ${timeout}`
  );
  if (datadog) {
    datadog.event(
      "timeout",
      "TetherProcessPinger timed out waiting for response",
      { alert_type: "error" }
    );
  }
  if (pm2) {
    const { processName } = config.pm2;
    logger.warn(
      `PM2 integration enabled; will attempt to restart process "${processName}"`
    );
    if (datadog) {
      datadog.increment("restartProcess");
    }
  }
};

const main = async () => {
  if (pm2) {
    setupPm2();
  }

  const agent = await TetherAgent.create("processPinger", config.tether);

  const pingOutput = agent.createOutput("ping");

  setInterval(() => {
    const now = Date.now();
    if (state.lastPingSentTime === null) {
      logger.debug("Sending ping at", now);
      state.lastPingSentTime = now;
      pingOutput.publish(); // empty message
    } else {
      logger.warn(
        "lastPingSentTime has not been reset; still waiting for reply?"
      );
      handleTimeout(now - state.lastPingSentTime, config.ping.timeout);
    }
  }, config.ping.interval);

  const pongInput = agent.createInput(
    "pong",
    config.ping.tetherAgentId !== undefined
      ? `+/${config.ping.tetherAgentId}/pong`
      : undefined
  );

  pongInput.onMessage((payload) => {
    if (state.lastPingSentTime === null) {
      logger.debug("No ping sent from here; ignore this pong");
    } else {
      const now = Date.now();
      const elapsed = now - state.lastPingSentTime;
      const { timeout } = config.ping;
      logger.debug(`${elapsed}ms between ping => pong`);
      if (elapsed <= timeout) {
        logger.debug("All good; reset for next ping interval");
        state.lastPingSentTime = null;
        if (datadog) {
          datadog.increment("heartbeat");
        }
        try {
          const content = decode(payload) as object;
          logger.info(
            "Decoded pong message body:",
            JSON.stringify(content, null, 2)
          );
          const keys = Object.keys(content);
          keys.forEach((key) => {
            const value = content[key];
            if (typeof value === "number") {
              logger.debug("parsed value in", { key, value });
              if (datadog) {
                datadog.gauge(key, value);
              }
            } else {
              logger.warn("Unknown value type for entry", { key, value });
            }
          });
        } catch (e) {
          logger.error("Error decoding pong message body:", e);
        }
      } else {
        handleTimeout(elapsed, timeout);
      }
    }
  });
};

main();
