import { test, expect } from "../fixtures/auth";

const API_URL = "http://localhost:8080";

test.describe("test-login @smoke", () => {
  test("POST /v1/auth/test-login returns access token and sets refresh cookie", async ({
    page,
    login,
  }) => {
    const tokens = await login(page);

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });

  test("refresh token cookie is set after test-login", async ({ authedPage }) => {
    // The refresh_token cookie is httpOnly, so we read it via context cookies.
    const cookies = await authedPage.context().cookies(API_URL);
    const refreshCookie = cookies.find((c) => c.name === "refresh_token");

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.httpOnly).toBe(true);
  });

  test("can call /v1/auth/refresh after test-login", async ({ authedPage }) => {
    const res = await authedPage.request.post(`${API_URL}/v1/auth/refresh`);

    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body.data.accessToken).toBeTruthy();
  });
});
