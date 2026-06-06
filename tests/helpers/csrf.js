function extractCsrfToken(html) {
  const match = html.match(/name="csrfToken"\s+value="([^"]+)"/i);

  if (!match) {
    throw new Error('CSRF token field not found in HTML response.');
  }

  return match[1];
}

async function getCsrfToken(agent, path) {
  const response = await agent.get(path);
  return extractCsrfToken(response.text);
}

module.exports = {
  extractCsrfToken,
  getCsrfToken
};
