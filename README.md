# Tether Process Pinger

This is a generic version of the "companion" app that has typically been used in our installations to run alongside a Very Important Process™️ (e.g. graphical output from a browser window) where we wish to restart the process if it becomes unresponsive for some reason.

## Why we need this

We use a process manager such as PM2 to ensure that a set of applications:

- start when the host finishes booting up
- get configured properly (using command-line args, environment variables, etc.)
- restart if the process crashes or exits, or exceeds certain bounds (e.g. memory usage)

This covers most of what we typically need; however, it does not guarantee that we will get any notification or have any suitable action taken (e.g. restarting) if one of our processes is **still running but has become unresponsive**. This can happen in the case of memory leaks, for example, where the application (e.g. "web app" running in the browser) might gradually get slower and slower but does not ever actually crash, or takes a very long time to actually crash. As programmers we of course try to avoid such situations but when subtle bugs creep into long-running software it is better to have notifications and instrumentation (e.g. via Datadog) when this happens, and to have a "fallback" (restart the application!) if unexpected problems do occur. An occasional restart is better than a hanging/unresponsive screen.

This is where the Process Pinger comes in: it regularly sends a "ping" message via Tether, to which the target application is expected to respond with a corresponding "pong" message. If the time between sending and receiving gets too long, it can notify us (via Datadog) and instruct PM2 to restart the process.

## Requirements for the target application

The target application is the process we intend to ping regularly to check if it is still responsive.

The only requirements on the target application are:

- it should implement a Tether Agent connection
- it should subscribe to "ping" messages (e.g on the topic `+/+/ping`)
- it should publish messages on a topic ending in "pong", e.g. `someType/someAgentID/pong`

More generally, you need to implement your applications (and systems) in such a way that a restart is **anticipated, even if it is not desirable**. Critical state information should preferably not get lost in the case of a restart at an awkward moment. "The show must go on"; your application should hopefully be back up and running as quickly as possible, and the rest of the system should be robust enough to either start over or pick up where you left off.

### Running multiple instances

It may occur that you desire or require multiple apps to be monitored, and so want to run multiple instances of this agent.  
In such a case, you can provide a `ping.tetherAgentId` configuration, which ensures that the process-pinger will only respond to pong messages from the agent with the specified agent ID.

If in your target apps you would additionally like to distinguish between ping messages from different instances of the process-pinger agent, so as to prevent each app from responding to each ping of each process-pinger instance, you can do so by providing a `tether.agentId`. If provided, this will be used as the agent ID for that process-pinger instance, allowing for targeted subscriptions.

## Optional, but recommended: PM2 Integration

PM2 integration can be disabled, e.g. for testing and development of this library.

Of course, the Process Pinger is much more useful with PM2 Integration enabled, as it allows the application to take action - namely, restarting the target application using the process name specified in `pm2.processName`.

This application assumes a PM2 instance is already running under the same user that launched this process. In fact, you should typically launch the Tether Process Pinger _itself_ using PM2.

## Optional: message contents

The content (payload) of the `ping` messages are always empty.

The content (payload) of the `pong` messages can be left empty, too. However, it can optionally contain data encoded using MessagePack. If the decoded object has key-value pairs where the value is a number, this is assumed to be a instrumentation metric that can be passed onto datadog. This could include, for example, a framerate report (`fps`) or a count of active sessions, etc.

## Optional: Datadog Integration

As mentioned above, Datadog will be used to relay metrics from the message contents of "pong" messages, if you choose to include these.

In addition, this application will increment a `heartbeat` metric each time it receives a "pong" message. This can be useful to put on a Dashboard to keep an eye on your Very Important Process™️.

Some Datadog Events are also generated, e.g. "error" events when the target application fails to respond in time.

You can specify tags to be used with Metrics and Events; in addition, this application will automatically append `targetApp:yourImportantProcess` so that you can easily associate heartbeat (ping responses) and any metrics with the target application, not Tether Process Pinger itself.
