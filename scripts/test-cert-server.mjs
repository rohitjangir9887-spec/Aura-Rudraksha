/**
 * Test-only helper (NOT used by the app):
 *
 * firebase-admin verifies Firebase ID tokens by fetching the signing
 * certificate from Google's x509 endpoint. That endpoint is unreachable from
 * this sandbox, so the test harness:
 *
 *   1. generates a throwaway self-signed certificate (openssl) for a local
 *      "service account",
 *   2. runs a tiny local HTTP server that serves that certificate,
 *   3. patches https.request so ONLY the Google cert URL is redirected to the
 *      local server. Every other request is untouched.
 *
 * All of firebase-admin's real verification (RS256 signature against the
 * served key, iss / aud / exp / kid checks) still executes.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const CERT_HOST = "www.googleapis.com";
export const CERT_PATH = "/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aura-p2-"));
const keyFile = path.join(tmpRoot, "key.pem");
const certFile = path.join(tmpRoot, "cert.pem");

execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048",
  "-keyout", keyFile, "-out", certFile,
  "-days", "2", "-nodes",
  "-subj", "/CN=securetoken@system.gserviceaccount.com"
]);

export const privateKey = fs.readFileSync(keyFile, "utf8");
export const serverCertPem = fs.readFileSync(certFile, "utf8");
export const tmpRootDir = tmpRoot;

// Local server that serves the certificate.
// Google's /x509/ endpoint returns a JSON object mapping key ids to PEM certs.
const certServer = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ localtest: serverCertPem }));
});
await new Promise((resolve) => certServer.listen(0, "127.0.0.1", resolve));
const localPort = certServer.address().port;

const realHttpsRequest = https.request.bind(https);
https.request = function (options, ...rest) {
  let pathname;
  if (typeof options === "string" || options instanceof URL) {
    const u = new URL(options);
    if (u.host === CERT_HOST && u.pathname.startsWith(CERT_PATH)) {
      // redirect to the local cert server
      return http.request({ host: "127.0.0.1", port: localPort, path: u.pathname, method: "GET" }, ...rest);
    }
  } else if (options && (options.host === CERT_HOST || options.hostname === CERT_HOST)) {
    pathname = options.path || "";
    if (pathname.startsWith(CERT_PATH)) {
      const newOptions = { ...options, host: "127.0.0.1", port: localPort };
      delete newOptions.hostname;
      delete newOptions.servername;
      delete newOptions.createConnection;
      delete newOptions.protocol; // must be plain http on the local cert server
      delete newOptions.secureEndpoint;
      delete newOptions.agent;
      return http.request(newOptions, ...rest);
    }
  }
  return realHttpsRequest.apply(https, [options, ...rest]);
};

export function stopCertServer() {
  return new Promise((resolve) => certServer.close(resolve));
}
