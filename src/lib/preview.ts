import type { Project } from "./types";
import { resolvePath } from "./vfs";
export type PreviewDocument = { html: string; dispose: () => void };
export function buildPreview(
  files: Project["files"],
  channel: string,
): PreviewDocument {
  if (files["index.html"]?.kind !== "text")
    return {
      html: '<!doctype html><html lang="ko"><body><p>index.html이 없습니다. 탐색기에서 만들어주세요.</p></body></html>',
      dispose: () => {},
    };
  const urls = new Map<string, string>(),
    building = new Set<string>(),
    created: string[] = [];
  function asset(path: string): string {
    if (urls.has(path)) return urls.get(path)!;
    const f = files[path];
    if (!f || f.kind === "directory") return "";
    if (f.kind === "binary") return f.content;
    if (building.has(path))
      throw new Error(
        `${path}: 순환 모듈 참조는 정적 미리보기에서 지원하지 않습니다.`,
      );
    building.add(path);
    let content = f.content;
    if (/\.css$/i.test(path))
      content = content
        .replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g, (match, quote, ref) => {
          const target = resolvePath(path, ref);
          return target && files[target] ? `url("${asset(target)}")` : match;
        })
        .replace(/@import\s+["']([^"']+)["']/g, (match, ref) => {
          const target = resolvePath(path, ref);
          return target && files[target] ? `@import "${asset(target)}"` : match;
        });
    if (/\.(m?js)$/i.test(path))
      content = content.replace(
        /\b(from\s*|import\s*)["']([^"']+)["']/g,
        (match, prefix, ref) => {
          const target = resolvePath(path, ref);
          return target && files[target]
            ? `${prefix}"${asset(target)}"`
            : match;
        },
      );
    const mime = /\.css$/i.test(path)
      ? "text/css"
      : /\.(m?js)$/i.test(path)
        ? "text/javascript"
        : f.mime;
    const url = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
    urls.set(path, url);
    building.delete(path);
    return url;
  }
  const doc = new DOMParser().parseFromString(
    files["index.html"].content,
    "text/html",
  );
  doc
    .querySelectorAll('base,meta[http-equiv="refresh"]')
    .forEach((n) => n.remove());
  const csp = doc.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content =
    "default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src data: blob:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
  doc.head.prepend(csp);
  for (const el of doc.querySelectorAll("[src],[href],[poster]"))
    for (const attr of ["src", "href", "poster"]) {
      const ref = el.getAttribute(attr);
      if (!ref) continue;
      const path = resolvePath("index.html", ref);
      if (path && files[path]) el.setAttribute(attr, asset(path));
    }
  doc
    .querySelectorAll("[srcset]")
    .forEach((el) => el.removeAttribute("srcset"));
  doc.querySelectorAll("style").forEach((el) => {
    el.textContent = (el.textContent ?? "").replace(
      /url\(\s*["']?([^)'"\s]+)["']?\s*\)/g,
      (match, ref) => {
        const path = resolvePath("index.html", ref);
        return path && files[path] ? `url("${asset(path)}")` : match;
      },
    );
  });
  const resources: Record<string, string> = {};
  for (const [path, f] of Object.entries(files))
    if (f.kind !== "directory") resources[path] = asset(path);
  const bridge = doc.createElement("script");
  bridge.textContent = `(()=>{const channel=${JSON.stringify(channel)},resources=${JSON.stringify(resources)};const emit=(level,text,line=0,path='index.html')=>parent.postMessage({channel,level,text:String(text).slice(0,3000),line,path},'*');for(const level of ['log','warn','error']){const original=console[level];console[level]=(...args)=>{emit(level,args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a)}catch{return String(a)}}).join(' '));original.apply(console,args)}}addEventListener('error',e=>emit('error',e.message,e.lineno,Object.keys(resources).find(k=>resources[k]===e.filename)||'index.html'));addEventListener('unhandledrejection',e=>emit('error',String(e.reason)));const originalFetch=fetch;window.fetch=(input,options)=>{const url=typeof input==='string'?input:input.url;const key=(url.startsWith('./')?url.slice(2):url).split(/[?#]/)[0];return originalFetch(resources[key]||input,options)};})();`;
  doc.head.insertBefore(bridge, csp.nextSibling);
  return {
    html: "<!doctype html>\n" + doc.documentElement.outerHTML,
    dispose: () => created.forEach((url) => URL.revokeObjectURL(url)),
  };
}
