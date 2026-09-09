import { getSiteBaseUrl } from './server/services/indexNowService.js';
const req = {
  get: (name) => {
    if (name === "x-forwarded-host") return undefined;
    if (name === "host") return "ais-dev-mb3ztpvsblep5raqrswdms-682347290025.asia-east1.run.app";
    if (name === "x-forwarded-proto") return "https";
  },
  protocol: "http"
};
console.log(getSiteBaseUrl(req));
