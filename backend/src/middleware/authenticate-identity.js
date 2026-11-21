import { CognitoJwtVerifier } from "aws-jwt-verify";
import env from "../config/env.js";

const verifier = CognitoJwtVerifier.create({
  userPoolId: env.cognito.userPoolId,
  tokenUse: "id",
  clientId: env.cognito.clientId,
});

const authenticateIdentity = async (req, res, next) => {
  try {
    const idToken = req.headers["x-id-token"];

    if (!idToken || typeof idToken !== "string") {
      return res.status(401).json({
        success: false,
        message: "Cognito ID token required",
      });
    }

    const payload = await verifier.verify(idToken);

    if (payload.sub !== req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Token identity mismatch",
      });
    }

    if (
      typeof payload.email !== "string" ||
      payload.email.trim() === "" ||
      payload.email_verified !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "A verified email address is required",
      });
    }

    req.user.email = payload.email.trim().toLowerCase();

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired Cognito ID token",
    });
  }
};

export default authenticateIdentity;
