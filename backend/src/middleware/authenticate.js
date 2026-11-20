import { CognitoJwtVerifier } from "aws-jwt-verify";
import env from "../config/env.js";

const verifier = CognitoJwtVerifier.create({
  userPoolId: env.cognito.userPoolId,
  tokenUse: "access",
  clientId: env.cognito.clientId,
});

const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload = await verifier.verify(token);

    req.user = {
      sub: payload.sub,
      username: payload.username,
      scopes: payload.scope ? payload.scope.split(" ") : [],
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

export default authenticate;
