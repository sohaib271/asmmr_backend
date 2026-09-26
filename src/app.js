import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "node:path";
import membershipRoutes from "./routes/membershipRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import publicationRoutes from "./routes/publicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewerRoutes from "./routes/reviewerRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, "")))
        return callback(null, true);
      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      callback(error);
    },
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads/profiles", express.static(path.resolve("uploads/profiles")));
app.use("/uploads/cvs", express.static(path.resolve("uploads/cvs")));
app.use((req, res, next) => {
  const origin = req.get("origin")?.replace(/\/$/, "");
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    origin &&
    !allowedOrigins.includes(origin)
  ) {
    return res
      .status(403)
      .json({ success: false, message: "This request origin is not allowed." });
  }
  next();
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.get("/api/health", (req, res) =>
  res.json({ success: true, status: "healthy" }),
);
app.use("/api/auth", authLimiter, authRoutes);
app.use(
  "/api/memberships",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  membershipRoutes,
);
app.use("/api/publications", publicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviewer", reviewerRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
