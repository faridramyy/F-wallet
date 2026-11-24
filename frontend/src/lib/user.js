// The best name we have for the signed-in user, from their Cognito profile.
export const getDisplayName = (profile) =>
  profile?.given_name ||
  profile?.name ||
  profile?.email ||
  profile?.preferred_username ||
  "User";
