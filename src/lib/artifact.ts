import JSZip from "jszip";
import { LIMITS, assertPath, validateFiles, textFile } from "./vfs";
import type { Project } from "./types";
export const POLICY_VERSION = "editor-static-v1";
const EXTENSIONS = new Set(
  "html htm css js mjs json md txt png jpg jpeg gif svg webp ico mp3 wav ogg mp4 woff woff2 ttf gltf glb bin".split(
    " ",
  ),
);
export function validateArtifact(files: Project["files"]) {
  validateFiles(files);
  if (files["index.html"]?.kind !== "text")
    throw new Error("최상위 index.html 파일이 필요합니다.");
  for (const [path, file] of Object.entries(files)) {
    if (file.kind === "directory") continue;
    if (!EXTENSIONS.has(path.split(".").at(-1)?.toLowerCase() ?? ""))
      throw new Error(
        `${path}: 배포에서 지원하지 않는 확장자입니다. TS/React는 먼저 정적 JS로 만들어야 합니다.`,
      );
    if (file.kind === "text" && /\.(html?|css|m?js)$/i.test(path)) {
      const patterns = [
        /\b(?:src|href|poster|action)\s*=\s*["'](\/(?!\/)[^"']*)["']/gi,
        /\burl\(\s*["']?(\/(?!\/)[^\s"')]+)["']?\s*\)/gi,
        /\b(?:fetch|importScripts|import)\(\s*["'`](\/(?!\/)[^"'`]*)["'`]/g,
        /\bfrom\s*["'](\/(?!\/)[^"']*)["']/g,
        /\bnew\s+(?:Worker|SharedWorker|URL)\(\s*["'`](\/(?!\/)[^"'`]*)["'`]/g,
      ];
      for (const pattern of patterns)
        for (const match of file.content.matchAll(pattern))
          if (match[1] !== "/" && !match[1].startsWith("/sdk/"))
            throw new Error(
              `${path}: 루트 절대 경로 ${match[1]}를 상대 경로로 바꾸세요.`,
            );
    }
  }
}
export function binaryBytes(dataUrl: string) {
  const match = /^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]*)$/.exec(dataUrl);
  if (!match) throw new Error("잘못된 바이너리 데이터입니다.");
  return Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
}
export async function createArtifact(files: Project["files"]) {
  validateArtifact(files);
  const zip = new JSZip();
  for (const [path, file] of Object.entries(files))
    if (file.kind !== "directory")
      zip.file(
        path,
        file.kind === "text" ? file.content : binaryBytes(file.content),
      );
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  if (bytes.length > LIMITS.zip)
    throw new Error("압축 ZIP은 30MB 이하여야 합니다.");
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return {
    bytes,
    sha256: Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
    policyVersion: POLICY_VERSION,
  };
}
export async function importArtifact(bytes: ArrayBuffer) {
  if (bytes.byteLength > LIMITS.zip)
    throw new Error("ZIP 파일은 30MB 이하만 가능합니다.");
  inspectZipDirectory(bytes);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: false });
  const files: Project["files"] = {};
  let actual = 0,
    count = 0;
  for (const entry of Object.values(zip.files)) {
    const original =
      (entry as typeof entry & { unsafeOriginalName?: string })
        .unsafeOriginalName ?? entry.name;
    if (entry.dir) {
      assertPath(original.replace(/\/$/, ""));
      continue;
    }
    assertPath(original);
    assertPath(entry.name);
    count++;
    const content = await inflateBounded(
      entry,
      Math.min(LIMITS.upload, LIMITS.total - actual),
    );
    actual += content.length;
    if (count > LIMITS.files || actual > LIMITS.total)
      throw new Error("ZIP의 실제 해제 크기가 한도를 초과했습니다.");
    if (/\.(html?|css|m?js|ts|json|md|txt|svg)$/i.test(entry.name))
      files[entry.name] = textFile(
        new TextDecoder("utf-8", { fatal: true }).decode(content),
      );
    else {
      if (content.length > LIMITS.upload)
        throw new Error(`${entry.name}: 바이너리는 5MB 이하만 가능합니다.`);
      const base64 =
        typeof Buffer !== "undefined"
          ? Buffer.from(content).toString("base64")
          : btoa(Array.from(content, (b) => String.fromCharCode(b)).join(""));
      files[entry.name] = {
        kind: "binary",
        content: `data:${mimeFor(entry.name)};base64,${base64}`,
        mime: mimeFor(entry.name),
        size: content.length,
      };
    }
  }
  validateArtifact(files);
  return files;
}
export function mimeFor(path: string) {
  const ext = path.split(".").at(-1)?.toLowerCase() ?? "";
  return (
    (
      {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        mp3: "audio/mpeg",
        mp4: "video/mp4",
        woff: "font/woff",
        woff2: "font/woff2",
      } as Record<string, string>
    )[ext] ?? "application/octet-stream"
  );
}

function inspectZipDirectory(bytes: ArrayBuffer) {
  const data = new DataView(bytes);
  let end = -1;
  for (
    let p = bytes.byteLength - 22;
    p >= Math.max(0, bytes.byteLength - 65557);
    p--
  )
    if (
      data.getUint32(p, true) === 0x06054b50 &&
      p + 22 + data.getUint16(p + 20, true) === bytes.byteLength
    ) {
      end = p;
      break;
    }
  if (end < 0) throw new Error("올바른 ZIP 종료 레코드가 없습니다.");
  const count = data.getUint16(end + 10, true),
    length = data.getUint32(end + 12, true),
    start = data.getUint32(end + 16, true);
  if (
    data.getUint16(end + 4, true) ||
    data.getUint16(end + 6, true) ||
    count !== data.getUint16(end + 8, true) ||
    count === 65535 ||
    start === 0xffffffff ||
    length === 0xffffffff ||
    start + length !== end
  )
    throw new Error("분할 ZIP 또는 ZIP64는 지원하지 않습니다.");
  if (count > LIMITS.files + 100)
    throw new Error("ZIP 파일 수가 한도를 초과했습니다.");
  const names = new Set<string>();
  let offset = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || data.getUint32(offset, true) !== 0x02014b50)
      throw new Error("ZIP 디렉터리가 손상되었습니다.");
    const flags = data.getUint16(offset + 8, true),
      method = data.getUint16(offset + 10, true),
      size = data.getUint32(offset + 24, true),
      nameSize = data.getUint16(offset + 28, true),
      extra = data.getUint16(offset + 30, true),
      comment = data.getUint16(offset + 32, true),
      mode = data.getUint32(offset + 38, true) >>> 16;
    if (flags & 1 || ![0, 8].includes(method) || (mode & 0xf000) === 0xa000)
      throw new Error("암호화 파일 또는 심볼릭 링크는 지원하지 않습니다.");
    if (offset + 46 + nameSize + extra + comment > end)
      throw new Error("ZIP 디렉터리 길이가 올바르지 않습니다.");
    const name = new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(bytes, offset + 46, nameSize),
    );
    assertPath(name.replace(/\/$/, ""));
    if (names.has(name.toLowerCase()))
      throw new Error("ZIP에 중복된 파일 경로가 있습니다.");
    names.add(name.toLowerCase());
    total += size;
    if (size > LIMITS.upload || total > LIMITS.total)
      throw new Error("ZIP 해제 크기 또는 파일 용량이 한도를 초과했습니다.");
    offset += 46 + nameSize + extra + comment;
  }
  if (offset !== end) throw new Error("ZIP 디렉터리 크기가 일치하지 않습니다.");
}
function inflateBounded(
  entry: JSZip.JSZipObject,
  limit: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0,
      failed = false;
    const stream = (
      entry as JSZip.JSZipObject & {
        internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array>;
      }
    ).internalStream("uint8array");
    stream.on("data", (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        stream.pause();
        reject(
          new Error(`${entry.name}: 실제 해제 크기가 한도를 초과했습니다.`),
        );
        return;
      }
      chunks.push(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      if (failed) return;
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(bytes);
    });
    stream.resume();
  });
}
