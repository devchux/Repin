export interface ParsedServerEvent {
  readonly id?: string;
  readonly type: string;
  readonly data: unknown;
}

export async function* parseServerEvents(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedServerEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const parsed = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (parsed) yield parsed;
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): ParsedServerEvent | undefined {
  let id: string | undefined;
  let type = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "id") id = value;
    if (field === "event") type = value;
    if (field === "data") data.push(value);
  }
  if (!data.length) return undefined;
  const value = data.join("\n");
  try {
    return { id, type, data: JSON.parse(value) as unknown };
  } catch {
    return { id, type, data: value };
  }
}
