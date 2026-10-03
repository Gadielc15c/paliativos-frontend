import { useEffect, useState } from "react";
import { httpClient } from "../../services/http";
import { agentEndpoints } from "../../services/endpoints/agent";

const cache = new Map<string, Promise<string>>();
/** blob:/data: URLs and other hosts are used as-is; API paths are fetched with auth. */
const needsAuth = (url: string) => {
  if (/^(blob:|data:)/.test(url)) return false;
  if (/^https?:\/\//i.test(url)) { const base = httpClient.defaults.baseURL; return !!base && url.startsWith(base); }
  return url.startsWith("/");
};

/** Resolves an attachment preview (`/agent/attachments/{file_ref}`) to something an <img> can show. */
export function usePreview(url?: string | null): string | null {
  const direct = url && !needsAuth(url) ? url : null;
  const [src, setSrc] = useState<string | null>(direct);
  useEffect(() => {
    if (!url) { setSrc(null); return; }
    if (!needsAuth(url)) { setSrc(url); return; }
    let alive = true;
    if (!cache.has(url)) cache.set(url, agentEndpoints.attachmentBlob(url).then((b) => URL.createObjectURL(b)));
    cache.get(url)!.then((u) => { if (alive) setSrc(u); }).catch(() => { cache.delete(url); if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [url]);
  return src;
}
