import { Response, CookieOptions } from "express";
import { envVars } from "../../config/env";
import { cookieUtils } from "./cookies";
import { jwtUtils } from "./jwt";
import { JwtPayload } from "jsonwebtoken";
import ms, { StringValue } from 'ms';

/** Shared cookie options — must match exactly when clearing cookies. */
const getAuthCookieOptions = (): CookieOptions => {
    const isProd = envVars.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
    };
};

const clearAuthCookie = (res: Response, key: string) => {
    cookieUtils.clearCookie(res, key, getAuthCookieOptions());
};

const clearAllAuthCookies = (res: Response) => {
    clearAuthCookie(res, "accessToken");
    clearAuthCookie(res, "refreshToken");
    clearAuthCookie(res, "better-auth.session_token");
};

const getAccessToken = (payload: JwtPayload) => {
    const accessToken = jwtUtils.createToken(payload, envVars.ACCESS_TOKEN_SECRET, {
        ...(envVars.ACCESS_TOKEN_EXPIRES_IN !== undefined
            ? { expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN }
            : {}),
    });
    return accessToken;
}

const getOAuthExchangeCode = (payload: JwtPayload) => {
    return jwtUtils.createToken(payload, envVars.BETTER_AUTH_SECRET, {
        expiresIn: "2m",
    });
}

const getRefreshToken = (payload: JwtPayload) => {
    const refreshToken = jwtUtils.createToken(payload, envVars.REFRESH_TOKEN_SECRET, {
        ...(envVars.REFRESH_TOKEN_EXPIRES_IN !== undefined
            ? { expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN }
            : {}),
    });
    return refreshToken;
}

const getAccessTokenFromCookie = (res: Response, token: string) => {
    const maxAge = ms(envVars.ACCESS_TOKEN_EXPIRES_IN as StringValue);
    cookieUtils.setCookie(res, 'accessToken', token, {
        ...getAuthCookieOptions(),
        maxAge,
    });
}

const getRefreshTokenFromCookie = (res: Response, token: string) => {
    const maxAge = ms(envVars.REFRESH_TOKEN_EXPIRES_IN as StringValue);
    cookieUtils.setCookie(res, 'refreshToken', token, {
        ...getAuthCookieOptions(),
        maxAge,
    });
}

const getBetterAuthAccessToken = (res: Response, token: string) => {
    const maxAge = ms(envVars.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN as StringValue);
    cookieUtils.setCookie(res, 'better-auth.session_token', token, {
        ...getAuthCookieOptions(),
        maxAge,
    });
}

const verifyOAuthExchangeCode = (token: string) => {
    return jwtUtils.verifyToken(token, envVars.BETTER_AUTH_SECRET);
}

export const tokenUtils = {
    getAccessToken,
    getOAuthExchangeCode,
    getRefreshToken,
    getAccessTokenFromCookie,
    getRefreshTokenFromCookie,
    getBetterAuthAccessToken,
    verifyOAuthExchangeCode,
    clearAllAuthCookies,
    getAuthCookieOptions,
}
