// عقدة «علامة الحاشية» داخل المتن: رقم مرتفع مرتبط بمستطيل حواشٍ بعينه.

import { Node, mergeAttributes } from "@tiptap/core";

export const NoteRef = Node.create({
  name: "noteRef",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      noteId: { default: "", parseHTML: element => element.getAttribute("data-note-id") ?? "" },
      laneId: { default: "", parseHTML: element => element.getAttribute("data-lane-id") ?? "" },
      label: { default: "", parseHTML: element => element.getAttribute("data-label") ?? "" },
      color: { default: "#1d4ed8", parseHTML: element => element.style.color || "#1d4ed8" },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-note-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, string>;
    return [
      "sup",
      mergeAttributes(
        {
          "data-note-id": attrs["noteId"] ?? "",
          "data-lane-id": attrs["laneId"] ?? "",
          "data-label": attrs["label"] ?? "",
          class: "note-ref",
          style: `color:${attrs["color"] ?? "#1d4ed8"}`,
        },
      ),
      `(${attrs["label"] ?? ""})`,
    ];
  },
});
