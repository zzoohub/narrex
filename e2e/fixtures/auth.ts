import { test as base, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:8080";

interface TestUser {
  email: string;
  name: string;
}

interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

interface AuthFixtures {
  /** A Page already authenticated as the default test user. */
  authedPage: Page;
  /** Login as a specific test user and return tokens. */
  login: (page: Page, user?: TestUser) => Promise<AuthTokens>;
}

const DEFAULT_USER: TestUser = {
  email: "e2e@test.narrex.app",
  name: "E2E Test User",
};

/**
 * Call POST /v1/auth/test-login from the browser context.
 * This sets the httpOnly refresh_token cookie on the page and returns the access token.
 */
async function testLogin(page: Page, user: TestUser = DEFAULT_USER): Promise<AuthTokens> {
  const res = await page.request.post(`${API_URL}/v1/auth/test-login`, {
    data: { email: user.email, name: user.name },
  });

  expect(res.ok(), `test-login failed: ${res.status()}`).toBe(true);

  const body = await res.json();
  return body.data as AuthTokens;
}

export const test = base.extend<AuthFixtures>({
  login: async ({}, use) => {
    await use(testLogin);
  },

  authedPage: async ({ page }, use) => {
    await testLogin(page);
    await use(page);
  },
});

export { expect };
