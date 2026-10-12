export function isLocalMode() {
  return process.env.APP_MODE === "local";
}
