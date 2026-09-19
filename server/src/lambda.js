const serverless = require("serverless-http");

const app = require("./app");

/*
  The adapter between Express and Lambda.

  Express expects an HTTP server with sockets, req and res. Lambda hands
  you a plain object describing the request and wants a plain object
  back. serverless-http translates in both directions: it fakes a request
  from the event, runs it through Express, and converts the response.

  Built here at module scope rather than inside the handler, so it is
  constructed once per container instead of once per request.
*/

const handler = serverless(app);

/*
  callbackWaitsForEmptyEventLoop is the important line.

  Lambda's default is to wait for the Node event loop to drain before
  returning a response. The cached Mongo connection in db.js is an open
  socket held open on purpose, so the loop never drains, and every
  request would hang until the 20 second timeout while being billed for
  the whole wait.

  Setting it false tells Lambda to respond as soon as the handler
  resolves and freeze the container with its open handles intact, so the
  next invocation thaws with the connection already there.

  This line and the caching in db.js only work as a pair. Caching without
  this hangs every request; this without caching just reconnects every
  time.
*/

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return handler(event, context);
};
