# Working Agreement

## Living architecture context

`ARCHITECTURE.md` is the mandatory architecture and project-context record for this subsystem.

For every change that modifies the product's routes, page ownership, navigation, shared styles/components, data model/source, persistence keys, asset source, dependency, permissions, or meaningful user flow, update `ARCHITECTURE.md` in the **same change**. Add a concise row to its architecture change log.

For purely cosmetic edits that do not alter any of those concerns, update the document only when the design-system guidance or a significant page behavior changes.

Do not mark work complete if the project context is stale.

## Product constraints

- This is a local presentation mock, not a backend-connected application.
- TBX is the only Service Provider. Do not reintroduce prior providers or their slugs in active UI, data or fallbacks.
- Preserve the existing visual system and shared beam sidebar behavior unless the task explicitly replaces them.
- Keep canonical routes and their redirect aliases synchronized.
