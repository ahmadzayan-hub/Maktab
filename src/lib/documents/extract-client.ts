import { DocumentEvidence, EvidenceError, LIMITS, fileFormat } from "./evidence";
export async function extractDocument(file: File, signal: AbortSignal): Promise<DocumentEvidence> {
  fileFormat(file.name, file.size);
  if (signal.aborted) throw new EvidenceError("cancelled");
  const bytes = await file.arrayBuffer();
  if (signal.aborted) throw new EvidenceError("cancelled");
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/document-extraction.worker.ts", import.meta.url), { type: "module" });
    const finish = (error?: Error, result?: DocumentEvidence) => {
      clearTimeout(timer); signal.removeEventListener("abort", cancel); worker.terminate();
      if (error) reject(error); else resolve(result!);
    };
    const cancel = () => finish(new EvidenceError("cancelled"));
    const timer = setTimeout(() => finish(new EvidenceError("timeout")), LIMITS.timeoutMs);
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event) => event.data.error ? finish(new EvidenceError(event.data.error)) : finish(undefined, event.data.result);
    worker.onerror = () => finish(new EvidenceError("corrupt"));
    worker.postMessage({ name: file.name, bytes }, [bytes]);
  });
}
