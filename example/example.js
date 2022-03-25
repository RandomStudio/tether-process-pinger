const { TetherAgent } = require("@tether/tether-agent");
const { encode } = require("@msgpack/msgpack");

const main = async (failProbability) => {
  const agent = await TetherAgent.create("dummy");

  const pingInput = agent.createInput("ping");
  const pongOutput = agent.createOutput("pong");

  pingInput.onMessage(() => {
    console.log("got ping!");
    const shouldRespond = Math.random() > failProbability;
    if (shouldRespond) {
      console.log("Responding with pong message");
      const stats = {
        fps: Math.random() * 60,
        some: "string",
      };
      pongOutput.publish(encode(stats));
    } else {
      console.warn("Oopsie; not going to respond");
    }
  });
};

main(0);
