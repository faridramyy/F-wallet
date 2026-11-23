import { WebStorageStateStore } from "oidc-client-ts";

// Cognito settings come from frontend/.env. Vite only exposes variables that
// start with VITE_ to browser code, so the names must keep that prefix.
//
//   VITE_COGNITO_USER_POOL_ID  e.g. ca-central-1_AbCdEf123
//   VITE_COGNITO_CLIENT_ID     the app client ID (public client, no secret)
//   VITE_COGNITO_DOMAIN        the managed login domain, used for sign-out,
//                              e.g. https://<prefix>.auth.ca-central-1.amazoncognito.com
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN?.replace(/\/+$/, "");

const missing = [
  ["VITE_COGNITO_USER_POOL_ID", userPoolId],
  ["VITE_COGNITO_CLIENT_ID", clientId],
  ["VITE_COGNITO_DOMAIN", cognitoDomain],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(
    `Missing ${missing.join(", ")} in frontend/.env. Restart the dev server after editing it.`,
  );
}

// The pool ID starts with its region: "ca-central-1_AbCdEf123".
const region = userPoolId.split("_")[0];

// The OIDC issuer (and discovery document) lives on cognito-idp, not on the
// managed login domain.
const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

export const cognitoAuthConfig = {
  authority,
  client_id: clientId,

  // Must exactly match an "Allowed callback URL" on the app client.
  redirect_uri: `${window.location.origin}/`,
  post_logout_redirect_uri: window.location.origin,

  response_type: "code",
  // Only scopes enabled on the app client are accepted (else invalid_scope).
  scope: "openid email",

  // Renew tokens with the refresh token shortly before they expire.
  automaticSilentRenew: true,

  userStore: new WebStorageStateStore({
    store: window.sessionStorage,
  }),

  // Drop ?code=&state= from the URL once signed in.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, "/");
  },
};

// Cognito does not publish an end_session_endpoint, so signoutRedirect()
// cannot be used. Its /logout endpoint ends the managed login session; the
// logout_uri must be listed under "Allowed sign-out URLs" on the app client.
export const getCognitoLogoutUrl = () => {
  const url = new URL(`${cognitoDomain}/logout`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", `${window.location.origin}/`);
  return url.toString();
};
