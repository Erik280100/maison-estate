/** Text aus einem PDF lesen (nur im Browser). Scans ohne Textebene liefern einen leeren String. */
export async function pdfText(buf: ArrayBuffer, maxPages = 6): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  let text = "";
  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += `\n--- Seite ${i} ---\n` + tc.items.map((t) => ("str" in t ? t.str + (t.hasEOL ? "\n" : " ") : "")).join("");
  }
  return text;
}
