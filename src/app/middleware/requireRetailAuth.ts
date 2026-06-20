import { NextFunction, Request, Response } from "express";
import { envVars } from "../../config/env";
import { checkAuth } from "./checkAuth";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Protects retail write routes when REQUIRE_AUTH=true.
 * GET (and OPTIONS) stay public so the client can load lists during dev.
 */
export const requireRetailAuth = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (!envVars.REQUIRE_AUTH || !WRITE_METHODS.has(req.method)) {
        return next();
    }

    return checkAuth()(req, res, next);
};
