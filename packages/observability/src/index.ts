type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;
type RootprintLogger = Partial<Record<Level, (message: string, fields?: Fields) => unknown>>;
type RootprintModule = { createLogger?: (scope: string) => RootprintLogger; rootprint?: { createLogger?: (scope: string) => RootprintLogger } };
const rootprintLoggers = new Map<string, Promise<RootprintLogger | null>>();
function loadRootprint(scope: string) {
  let logger = rootprintLoggers.get(scope);
  if (!logger) {
    const packageName = "@vigor/observability";
    logger = import(packageName).then(module => {
    const sdk = module as unknown as RootprintModule;
    return sdk.createLogger?.(scope) ?? sdk.rootprint?.createLogger?.(scope) ?? null;
    }).catch(() => null);
    rootprintLoggers.set(scope, logger);
  }
  return logger;
}

/** Structured logs work in local development; configured Rootprint ingestion receives the same events. */
export function createLogger(scope: string) {
  async function write(level: Level, message: string, fields: Fields = {}) {
    const event = { timestamp: new Date().toISOString(), level, scope, message, ...fields };
    const output = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    const rootprint = await loadRootprint(scope);
    if (rootprint?.[level]) { await rootprint[level]!(message, fields); return; }
    output(JSON.stringify(event));
    const endpoint = process.env.ROOTPRINT_INGEST_URL;
    if (!endpoint) return;
    try { await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(process.env.ROOTPRINT_TOKEN ? { authorization: `Bearer ${process.env.ROOTPRINT_TOKEN}` } : {}) }, body: JSON.stringify(event), signal: AbortSignal.timeout(2500) }); }
    catch (error) { console.warn(JSON.stringify({ level: "warn", scope, message: "Rootprint log delivery failed", error: error instanceof Error ? error.message : String(error) })); }
  }
  return { info: (message: string, fields?: Fields) => write("info", message, fields), warn: (message: string, fields?: Fields) => write("warn", message, fields), error: (message: string, fields?: Fields) => write("error", message, fields) };
}
