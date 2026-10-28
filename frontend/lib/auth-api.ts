const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type RequestOptions = Omit<RequestInit, "credentials"> & {
  retry?: boolean;
};

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

let refreshRequest: Promise<Response> | null = null;

function apiUrl(endpoint: string) {
  return `${API_URL}/${endpoint.replace(/^\/+/, "")}`;
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = fetch(apiUrl("api/users/refresh"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .catch(() => {
        throw new Error(
          "Unable to verify your session right now. Please try again.",
        );
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function authRequest(
  endpoint: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { retry = true, ...requestOptions } = options;
  const url = apiUrl(endpoint);
  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to connect to the server. Please try again.");
  }

  if (response.status !== 401 || !retry) {
    return response;
  }

  const refreshResponse = await refreshSession();

  if (refreshResponse.status === 401 || refreshResponse.status === 403) {
    return response;
  }

  if (!refreshResponse.ok) {
    throw new Error("Unable to verify your session right now. Please try again.");
  }

  return authRequest(endpoint, {
    ...requestOptions,
    retry: false,
  });
}

function responseMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return "";
}

function safeErrorMessage(payload: unknown, status: number, fallback: string) {
  const message = responseMessage(payload);

  if (message === "Invalid email or password") return message;
  if (message === "User already exists") {
    return "An account with this email already exists.";
  }
  if (message === "Name, email and password are required") {
    return "Enter your name, email address, and password.";
  }
  if (message === "Email and password are required") {
    return "Enter your email address and password.";
  }
  if (message === "Password must be at least 8 characters") {
    return "Your password must contain at least 8 characters.";
  }
  if (
    message === "Your account was created, but the verification email could not be sent. Please request another email."
  ) {
    return message;
  }
  if (message === "Verify your email address before signing in") {
    return "Verify your email address before signing in. You can request a new verification link from the signup page.";
  }
  if (
    message === "This verification link is invalid, expired, or already used."
  ) {
    return "This verification link is invalid, expired, or already used. Request a new one.";
  }
  if (
    message === "Invalid or expired reset token" ||
    message === "Invalid, expired, or already used reset token"
  ) {
    return "This reset link is invalid, expired, or already used. Request a new one.";
  }
  if (status >= 500) {
    return "The server encountered an error. Please try again.";
  }

  return message || fallback;
}

export async function postAuthRequest(
  endpoint: string,
  data?: unknown,
  fallback = "The request could not be completed. Please try again.",
  options: Pick<RequestOptions, "retry"> = {},
): Promise<unknown> {
  const response = await authRequest(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    retry: options.retry,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      safeErrorMessage(payload, response.status, fallback),
      response.status,
    );
  }

  return payload;
}

export async function getAuthPayload(
  endpoint: string,
  options: Pick<RequestOptions, "retry"> = {},
): Promise<unknown> {
  const response = await authRequest(endpoint, {
    method: "GET",
    retry: options.retry,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      safeErrorMessage(
        payload,
        response.status,
        "Unable to load this information. Please try again.",
      ),
      response.status,
    );
  }

  return payload;
}
