// wilma-api.js - Direct Wilma API client
//
// Authenticates with Wilma via HTTP and fetches the /overview JSON endpoint.
// Replaces the Puppeteer-based school-portal.js with direct API calls.

require('dotenv').config();
const { CookieJar } = require('tough-cookie');

const WILMA_BASE_URL = process.env.WILMA_BASE_URL;
const WILMA_USERNAME = process.env.WILMA_USERNAME;
const WILMA_PASSWORD = process.env.WILMA_PASSWORD;
const WILMA_STUDENT_NUMBER = process.env.WILMA_STUDENT_NUMBER;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

// Validate required env vars at module load
const REQUIRED_ENV = { WILMA_BASE_URL, WILMA_USERNAME, WILMA_PASSWORD, WILMA_STUDENT_NUMBER };
for (const [name, value] of Object.entries(REQUIRED_ENV)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

/**
 * Low-level HTTP request with automatic cookie management.
 * Reads and stores cookies via the provided tough-cookie jar.
 */
async function rawRequest(jar, path, options = {}) {
  const url = new URL(path, WILMA_BASE_URL).toString();
  const cookieHeader = jar.getCookieStringSync(url);

  const headers = {
    'User-Agent': USER_AGENT,
    'Referer': `${WILMA_BASE_URL}/`,
    ...(options.headers || {}),
  };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body !== undefined) fetchOptions.body = options.body;
  if (options.redirect) fetchOptions.redirect = options.redirect;

  const resp = await fetch(url, fetchOptions);

  // Store cookies from response (Node 20+ has getSetCookie; older has get)
  const setCookies = resp.headers.getSetCookie?.() ?? [];
  if (setCookies.length) {
    for (const cookie of setCookies) {
      jar.setCookieSync(cookie, url);
    }
  } else {
    const raw = resp.headers.get('set-cookie');
    if (raw) jar.setCookieSync(raw, url);
  }

  return resp;
}

/**
 * Obtain the session token needed for the login POST.
 * Tries the login form's hidden SESSIONID field first,
 * falls back to the /token JSON endpoint.
 */
async function getSessionToken(jar) {
  const resp = await rawRequest(jar, '/login');
  const html = await resp.text();

  const formMatch = /name="SESSIONID"\s+value="([^"]+)"/.exec(html);
  if (formMatch) return formMatch[1];

  const tokenResp = await rawRequest(jar, '/token');
  if (tokenResp.status !== 200) {
    throw new Error(`Failed to fetch login token: HTTP ${tokenResp.status}`);
  }

  const tokenText = await tokenResp.text();
  let data;
  try {
    data = JSON.parse(tokenText);
  } catch {
    throw new Error('Failed to parse /token response as JSON');
  }

  if (!data.Wilma2LoginID) {
    throw new Error('Wilma2LoginID not found in /token response');
  }

  return data.Wilma2LoginID;
}

/**
 * Authenticate with Wilma.
 * Returns a CookieJar containing a valid Wilma2SID session cookie.
 */
async function login() {
  const jar = new CookieJar();
  const sessionToken = await getSessionToken(jar);

  const body = new URLSearchParams({
    Login: WILMA_USERNAME,
    Password: WILMA_PASSWORD,
    SESSIONID: sessionToken,
  });

  const resp = await rawRequest(jar, '/login', {
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirect: 'manual',
  });

  // Always consume response body to release the connection
  const text = await resp.text();

  const hasSession = jar.getCookiesSync(WILMA_BASE_URL)
    .some(c => c.key === 'Wilma2SID');

  if (!hasSession) {
    if (/loginFailed/i.test(text)) {
      throw new Error('Wilma login failed: invalid credentials');
    }
    throw new Error('Wilma login failed: no session cookie received');
  }

  console.log('Authenticated with Wilma');
  return jar;
}

/**
 * Fetch the /overview endpoint for the configured student.
 * Returns the raw API response object containing Groups[], Schedule[], and Exams[].
 */
async function fetchOverview(jar) {
  const path = `/!${WILMA_STUDENT_NUMBER}/overview`;
  const resp = await rawRequest(jar, path);

  if (resp.status === 401) {
    throw new Error('Wilma session expired or unauthorized');
  }
  if (!resp.ok) {
    throw new Error(`Wilma API error: HTTP ${resp.status} at ${path}`);
  }

  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Wilma /overview returned non-JSON response: ${text.substring(0, 200)}`
    );
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Wilma /overview returned invalid data');
  }

  const groupCount = (data.Groups || []).length;
  console.log(`Fetched overview: ${groupCount} course groups`);
  return data;
}

module.exports = { login, fetchOverview };
