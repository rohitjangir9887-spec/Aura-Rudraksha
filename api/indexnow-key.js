import { getIndexNowKey } from "../server/services/indexNowService.js";

export default function handler(req, res) {
  const key = getIndexNowKey();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(key);
}
