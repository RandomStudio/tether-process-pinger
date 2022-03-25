# Tether Process Pinger

This is a generic version of the "companion" app that has typically been used in our installations to run alongside of a very important process (e.g. graphical output from a browser window) where we wish to restart the process if it becomes unresponsive for some reason.

## Why we need this

We use a process manager such as PM2 to ensure that a set of applications

- start when the host finishes booting up
- get configured properly (using command-line args, environment variables, etc.)
- restart if the process crashes or exits, or exceeds certain bounds (e.g. memory usage)

This covers most of what we typically need; however, it does not guarantee that we will get any notification or have any suitable action taken (e.g. restarting) if one of our processes is still running but has become unresponsive.

This is where the Process Pinger comes in: it sends a "ping" message via Tether, to which the target application is expected to respond with a corresponding "pong" message.

## Requirements for the target application

The target application is the process we intend to ping regularly to check if it is still responsive.

The only requirements on the target application are:

- it should implement a Tether Agent connection
- it should subscribe to "ping" messages (e.g on the topic `+/+/ping`)
- it should publish messages on a topic ending in "pong", e.g. `someType/someAgentID/pong`

## Optional, but recommended: PM2 Integration

PM2 integration can be disabled, e.g. for testing and development of this library.

Of course, the Process Pinger is much more useful with PM2 Integration enabled, as it allows the application to take action - namely, restarting the target application using the process name specified in `pm2.processName`.

This application assumes a PM2 instance is already running under the same user that launched this process. In fact, you should typically launch the Tether Process Pinger _itself_ using PM2.

## Optional: message contents

The content (payload) of the `ping` messages are always empty.

The content (payload) of the `pong` messages can be left empty, too. However, it can optionally contain data encoded using MessagePack. If the decoded object has key-value pairs where the value is a number, this is assumed to be a instrumentation metric that can be passed onto datadog. This could include, for example, a framerate report (`fps`) or a count of active sessions, etc.

## Optional: Datadog Integration

As mentioned above, Datadog will be used to relay metrics from the message contents of "pong" messages, if you choose to include these.

In addition, this application will increment a `heartbeat` metric each time it receives a "pong" message. This can be useful to put on a Dashboard to keep an eye on your Super Important Process™️.

Some Datadog Events are also generated, e.g. "error" events when the target application fails to respond in time.

You can specify tags to be used with Metrics and Events; in addition, this application will automatically append `targetApp:yourImportantProcess` so that you can easily associate heartbeat (ping responses) and any metrics with the target application, not Tether Process Pinger itself.
