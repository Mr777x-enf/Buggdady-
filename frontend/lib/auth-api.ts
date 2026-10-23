export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

let currentSession: AuthTokens | null = null;

export function setAuthSession(tokens: AuthTokens) {
  currentSession = tokens;
}

export function getAccessToken() {
  return currentSession?.accessToken ?? null;
}

export function getRefreshToken() {
  return currentSession?.refreshToken ?? null;
}

export async function refreshAuthSession() {
  const refreshToken = currentSession?.refreshToken;

  if (!refreshToken) {
    throw new Error("Please sign in again to continue.");
  }

  try {
    const payload = await postAuthRequest(
      "api/users/refresh",
      { refreshToken },
      "Your session has expired. Please sign in again.",
    );

    if (!isRecord(payload) || typeof payload.accessToken !== "string") {
      currentSession = null;
      throw new Error("Your session has expired. Please sign in again.");
    }

    currentSession = { accessToken: payload.accessToken, refreshToken };
    return payload.accessToken;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      currentSession = null;
    }

    throw error;
  }
}

function getApiUrl(endpoint: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("Authentication service is not configured.");
  }

  return `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSafeErrorMessage(
  payload: unknown,
  status: number,
  fallback: string,
) {
  const message =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : "";

  if (status === 409 && message === "User already exists") {
    return "An account with this email already exists.";
  }

  if (message === "Invalid email or password") {
    return message;
  }

  if (message === "Email and password are required") {
    return "Enter your email address and password.";
  }

  if (message === "Name, email and password are required") {
    return "Enter your name, email address, and password.";
  }

  if (status >= 500 || message === "Internal server error") {
    return "The server encountered an error. Please try again.";
  }

  return fallback;
}

export async function postAuthRequest(
  endpoint: string,
  body: Record<string, string>,
  fallback: string,
): Promise<unknown> {
  const url = getApiUrl(endpoint);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to connect to the server. Please try again.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthApiError(
      getSafeErrorMessage(payload, response.status, fallback),
      response.status,
    );
  }

  return payload;
}

export function readAuthTokens(payload: unknown): AuthTokens | null {
  if (
    !isRecord(payload) ||
    typeof payload.accessToken !== "string" ||
    typeof payload.refreshToken !== "string" ||
    payload.accessToken.length === 0 ||
    payload.refreshToken.length === 0
  ) {
    return null;
  }

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}
