// Defense in depth for the local production server. Never log content or query strings.
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
if (process.env.APP_MODE !== "local")
  throw new Error("Local network guard requires APP_MODE=local.");
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // Node internally passes normalized [options, callback] arrays too.
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = first && typeof first === "object" ? first : null;
  const host = options
    ? options.host || "localhost"
    : typeof args[1] === "string"
      ? args[1]
      : "localhost";
  const allowed = ["127.0.0.1", "::1", "localhost"].includes(host);
  if (process.env.LOCAL_NETWORK_LOG)
    fs.appendFileSync(
      path.resolve(process.env.LOCAL_NETWORK_LOG),
      JSON.stringify({ at: new Date().toISOString(), host, allowed }) + "\n",
    );
  if (!allowed)
    throw new Error("Externer Netzwerkzugriff im lokalen Modus gesperrt.");
  return original.apply(this, args);
};
