export function logRequest(scope: string, metadata: Record<string, unknown>) {
  console.info(`[${scope}]`, metadata);
}
