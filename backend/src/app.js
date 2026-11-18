import express from "express";
import morgan from "morgan";

import apiRoutes from "./routes/index.js";
import notFound from "./middleware/not-found.js";
import errorHandler from "./middleware/error-handler.js";

const app = express();

// Global middleware
app.use(morgan("dev"));
app.use(express.json());

// API routes
app.use("/api", apiRoutes);

// Handle unknown routes
app.use(notFound);

// Centralized error handling (must be last)
app.use(errorHandler);

export default app;
