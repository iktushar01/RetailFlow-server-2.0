import express, { Application, NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import path from "node:path";
import { envVars } from "./config/env";
import { IndexRoute } from "./app/routes/index";
import { RetailRoute } from "./app/routes/retail.routes";
import { globalErrorhandler } from "./app/middleware/globalErrorhandler";
import { notFound } from "./app/middleware/notFound";
import { auth } from "./app/lib/auth";

const app: Application = express();

app.set("view engine", "ejs");
app.set("views",path.resolve(process.cwd(), `src/app/templates`) )

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

const allowedOrigins = new Set(
    [
        envVars.FRONTEND_URL,
        envVars.BETTER_AUTH_URL,
        ...envVars.FRONTEND_URLS,
        "https://retail-flow-client.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5000",
    ]
        .filter(Boolean)
        .map(normalizeOrigin),
);

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use("/api/auth", toNodeHandler(auth))
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("RetailFlow API server is running");
});

// RetailFlow client expects flat root paths (/products, /suppliers, …)
app.use("/", RetailRoute);

app.use("/api/v1", IndexRoute);


app.use(globalErrorhandler);
app.use(notFound);
export default app;
