import { usePlatformStore } from "../store/platform";

export function join(base: string, ...parts: string[]): string {
  const platformSep = usePlatformStore.getState().pathSep;
  const isWindowsPath = platformSep === "\\" && base.includes("\\");
  const sep = isWindowsPath ? "\\" : "/";

  if (sep === "\\") {
    let result = base.replace(/\\+$/, "");
    for (const part of parts) {
      result += "\\" + part.replace(/^\\+|\\+$/g, "");
    }
    return result;
  }

  let result = base.replace(/\/+$/, "");
  for (const part of parts) {
    result += "/" + part.replace(/^\/+|\/+$/g, "");
  }
  return result || "/";
}

export function parentPath(p: string): string | null {
  const isWindows = /^[a-zA-Z]:\\/.test(p);
  const sep = isWindows ? "\\" : "/";

  if (isWindows && /^[a-zA-Z]:\\$/.test(p)) return null;
  if (!isWindows && p === "/") return null;

  const clean = p.endsWith(sep) && p.length > sep.length ? p.slice(0, -sep.length) : p;
  const lastSep = clean.lastIndexOf(sep);

  if (isWindows && lastSep === 2) {
    return clean.slice(0, 3);
  }

  if (lastSep <= 0) {
    return sep;
  }

  return clean.slice(0, lastSep);
}
