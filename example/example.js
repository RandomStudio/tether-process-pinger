const { TetherAgent } = require("@tether/tether-agent");

const main = async (failProbability) => {
  const agent = await TetherAgent.create("dummy");

  const pingInput = agent.createInput("ping");
  const pongOutput = agent.createOutput("pong");

  pingInput.onMessage(() => {
    console.log("got ping!");
    const shouldRespond = Math.random() > failProbability;
    if (shouldRespond) {
      console.log("Responding with pong message");
      pongOutput.publish();
    } else {
      console.warn("Oopsie; not going to respond");
    }
  });
};

main(0);
