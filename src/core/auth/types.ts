/** Verified PayUp access JWT — identity is always `userId` (= JWT `sub`). */
export type AuthContext = {
  userId: string;
};

export type PayUpAccessTokenClaims = {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

export type AuthErrorCode =
  | "TOKEN_MISSING"
  | "TOKEN_INVALID"
  | "UNAUTHORIZED"
  | "INVALID_BODY"
  | "INTERNAL_ERROR";
