import { CognitoJwtVerifier } from "aws-jwt-verify";
import { JwtExpiredError } from "aws-jwt-verify/error";
import env from "../config/env.js";
import { createError } from "../utils/http-error.js";
import {
  TOKEN_PREFIX,
  findTokenByValue,
  touchToken,
} from "../modules/api-tokens/api-tokens.service.js";

// Two ways to authenticate:
//
// 1. requireAuth (every protected route): a Cognito sign-in.
// 2. allowApiToken (only on POST /transactions): a Cognito sign-in OR a
//    personal API token ("Authorization: Bearer fw_..."), for scripts such
//    as an iPhone Shortcut. A token can add transactions and nothing else.
//
// Either way req.user is { sub, email, ... }; token requests also carry
// req.user.apiTokenId.
//
// Every Cognito request carries two Cognito tokens from the same sign-in:
//
//   Authorization: Bearer <access token>  -> proves the caller may use the API
//   X-ID-Token:    <id token>             -> carries the verified email
//
// Cognito access tokens have no email claim, which is why the ID token is
// sent as well. Both are verified locally against the pool's public keys
// (JWKS); no request to Cognito is made per API call.

const { userPoolId, clientId } = env.cognito;

const accessVerifier = CognitoJwtVerifier.create({
  userPoolId,
  clientId,
  tokenUse: "access",
});

const idVerifier = CognitoJwtVerifier.create({
  userPoolId,
  clientId,
  tokenUse: "id",
});

// Downloads the pool's signing keys once at startup so the first request
// doesn't wait for them, and so a wrong pool ID shows up in the logs early.
export const warmUpAuth = () => accessVerifier.hydrate();

const bearerToken = (req) =>
  /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "")?.[1];

const requireAuth = async (req, res, next) => {
  const accessToken = bearerToken(req);
  const idToken = req.headers["x-id-token"];

  if (!accessToken || typeof idToken !== "string" || !idToken) {
    return next(createError("Sign in to continue.", 401, "auth_required"));
  }

  let access;
  let identity;

  try {
    [access, identity] = await Promise.all([
      accessVerifier.verify(accessToken),
      idVerifier.verify(idToken),
    ]);
  } catch (error) {
    // "token_expired" tells the client to refresh its tokens and retry.
    if (error instanceof JwtExpiredError) {
      return next(
        createError("Your session has expired.", 401, "token_expired"),
      );
    }

    return next(createError("Invalid sign-in token.", 401, "token_invalid"));
  }

  if (identity.sub !== access.sub) {
    return next(
      createError("Sign-in tokens do not match.", 401, "token_mismatch"),
    );
  }

  const email =
    typeof identity.email === "string"
      ? identity.email.trim().toLowerCase()
      : "";

  if (!email || identity.email_verified !== true) {
    return next(
      createError(
        "A verified email address is required.",
        403,
        "email_unverified",
      ),
    );
  }

  req.user = {
    sub: access.sub,
    username: access.username,
    email,
    scopes: access.scope ? access.scope.split(" ") : [],
  };

  next();
};

// Accepts a personal API token as well as a Cognito sign-in.
export const allowApiToken = async (req, res, next) => {
  const token = bearerToken(req);

  if (!token?.startsWith(TOKEN_PREFIX)) {
    return requireAuth(req, res, next);
  }

  try {
    const found = await findTokenByValue(token);

    if (!found) {
      return next(createError("Invalid API token.", 401, "token_invalid"));
    }
    if (found.status !== "active") {
      return next(
        createError("This API token was revoked.", 401, "token_revoked"),
      );
    }
    if (found.expires_at && new Date(found.expires_at) <= new Date()) {
      return next(
        createError("This API token has expired.", 401, "token_expired"),
      );
    }

    req.user = {
      sub: found.user_id,
      email: found.email,
      scopes: [],
      apiTokenId: found.api_token_id,
    };

    // Bookkeeping only: a failure here must not fail the request.
    touchToken(found.api_token_id).catch((error) =>
      console.error("[auth] Could not record token use:", error.message),
    );

    next();
  } catch (error) {
    next(error);
  }
};

export default requireAuth;
