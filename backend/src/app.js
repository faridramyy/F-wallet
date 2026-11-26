import express from "express";
import cors from "cors";
import morgan from "morgan";
import env from "./config/env.js";

import apiRoutes from "./routes/index.js";
import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-ID-Token",
      "Idempotency-Key",
    ],
    exposedHeaders: ["Idempotent-Replayed"],
  }),
);

app.use(morgan(env.nodeEnv === "production" ? "tiny" : "dev"));
app.use(express.json());

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
