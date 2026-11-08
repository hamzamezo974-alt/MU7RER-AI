<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep site sections inside the shared compact shell, while the editor retains the fixed-center three-pane workspace.
- Scope browser and cloud workspace data by authenticated user, because every account must see only its own material.
- Share AI credential selection and task-response parsing through one browser-safe module so every editing and OCR tool uses the same account-scoped key and error handling.
- Page transformations create new stored pages and retain previous page references for session undo; pure geometry and ordering helpers keep repeat crops and right-to-left splits testable.
- The account-scoped source catalog owns immutable page references, original-file metadata, ordered snapshot groups and transformation provenance; pane metadata is only the currently selected view, so closing a pane never deletes a source.
- Store per-page text revisions and explicit approval in account-scoped workspace storage, and assemble immutable revision snapshots into separate documents with an idempotent signature; this preserves review decisions without rewriting the working text.
- Track captured editor insertion positions through transaction mappings and reset them on document changes; this prevents review tools from inserting into a stale or different document.
- Keep research evidence and collation decisions in account-scoped catalogs, and copy evidence snapshots into notes; later reference edits must not rewrite approved citations.
- Use the diff library for textual comparison and docx for genuine Word exports; structured review records preserve provenance without pretending HTML is a Word document.
- Resolve each text operation through the same pure working-text helper so chained edits use the prior draft and failed requests cannot replace it.
- Library adapters are read-only local exporters into a validated page corpus; corpus blobs stay account-scoped in IndexedDB while evidence snapshots retain source digests and original locators, so library removal cannot rewrite citations. Grounded library questions reuse the shared AI client with explicitly selected lexical retrieval evidence; never represent this as universal native Shamela compatibility or vector search.
- Selected manuscript review uses an authenticated server function and strict Responses output; locate literal quote occurrences locally and map them to editor text nodes, invalidate on unrelated document changes, and apply only explicitly accepted literal replacements so stale model positions cannot overwrite another passage.
- Investigation documents own ordered face-linked records; render only the active record, preserve other records' notes, and assemble continuous text only for browsing and export. Immutable source/page IDs are authoritative over pane indices.
- Pin the shared AI SDK provider interface across adapters and core to avoid incompatible patch-level response types; never cast incompatible model implementations.
- Assemble assistant context at send time from active record text, marked footnotes and both current page images; the shared context descriptor declares only attached evidence so the assistant cannot claim whole-book access or unapplied annotations.
- Store PDF pages as immutable original-file/page-number references and render only requested pages through the shared page lookup; this avoids eager whole-book conversion and keeps image tools compatible.
