const serverless = require("serverless-http");

const app = require("./app");

/*
  callbackWaitsForEmptyEventLoop is left on by serverless-http's default
  behaviour in some setups, which makes Lambda wait for the Mongo socket
  to close before returning. Turning it off is what lets the connection
  stay warm between invocations.
*/

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return handler(event, context);
};
