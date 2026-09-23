import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { ensureAdminAccount } from './config/admin.js';
const port = process.env.PORT || 5000;
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must contain at least 32 characters in production.');
await connectDatabase();
await ensureAdminAccount();
const server = app.listen(port, () =>
  console.log(`ASMMR API running on port ${port}`),
);
const shutdown = (signal) => {
  console.log(`${signal} received. Closing server.`);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
