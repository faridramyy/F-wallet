const mongoose = require("mongoose");

/*
  Lambda reuses the Node process between invocations while the container
  stays warm. Opening a new Mongo connection on every request would burn
  through Atlas connection limits fast, so the connection promise is cached
  on the module scope and reused.

  bufferCommands is off so a query fails fast instead of hanging until the
  Lambda times out when the database is unreachable.
*/

let cached = global.__fwalletMongo;

if (!cached) {
  cached = global.__fwalletMongo = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not set.");
    }

    mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        maxPoolSize: 5,
      })
      .then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;

    throw error;
  }

  return cached.conn;
}

module.exports = { connectToDatabase };
