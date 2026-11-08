import { Document, Packer, Paragraph, TextRun } from "docx";
import type { NotesState } from "./notes";

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportWord(title: string, html: string, notes: NotesState) {
  const container = document.createElement("div"); container.innerHTML = html;
  const paragraphs: Paragraph[] = [];
  const walk = (node: Node): TextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) return [new TextRun({ text: node.textContent ?? "", rightToLeft: true })];
    if (!(node instanceof HTMLElement)) return [];
    if (node.tagName === "BR") return [new TextRun({ break: 1 })];
    if (node.dataset["noteId"]) return [new TextRun({ text: node.textContent ?? "", superScript: true })];
    if (["STRONG", "B", "EM", "I", "U"].includes(node.tagName)) return [new TextRun({ text: node.textContent ?? "", bold: ["STRONG", "B"].includes(node.tagName), italics: ["EM", "I"].includes(node.tagName), ...(node.tagName === "U" ? { underline: {} } : {}), rightToLeft: true })];
    return Array.from(node.childNodes).flatMap(walk);
  };
  const blocks = container.querySelectorAll("p,h1,h2,h3,li,td,th");
  blocks.forEach(block => { if (block.querySelector("p,h1,h2,h3,li,td,th")) return; paragraphs.push(new Paragraph({ bidirectional: true, children: Array.from(block.childNodes).flatMap(walk) })); });
  if (!paragraphs.length) paragraphs.push(new Paragraph({ bidirectional: true, text: container.textContent ?? "" }));
  const printed = new Set(notes.lanes.filter(lane => lane.printed).map(lane => lane.id));
  const noteRows = notes.notes.filter(note => note.label && printed.has(note.laneId));
  if (noteRows.length) paragraphs.push(new Paragraph({ bidirectional: true, text: "الحواشي" }));
  for (const note of noteRows) paragraphs.push(new Paragraph({ bidirectional: true, children: [new TextRun({ text: `(${note.label}) ${note.text}`, rightToLeft: true })] }));
  const doc = new Document({ title, sections: [{ children: paragraphs }], styles: { default: { document: { run: { font: "Amiri", size: 28 }, paragraph: { spacing: { after: 160 } } } } } });
  downloadBlob(await Packer.toBlob(doc), `${title.replace(/[\\/:*?"<>|]/g, "_") || "مستند"}.docx`);
}