---
name: Runner selection initialization
description: Why synchronous shared demo-runner identity and resolved form selection matter.
---

Resolve the saved demo runner synchronously and share runner changes across all consumers. A form's displayed Map and submitted identifiers must come from the same current-runner selection.

**Why:** Initializing each consumer to the default runner and loading the saved runner in an effect allowed cached default-runner Maps to initialize a form first. The native select then visually showed a valid Map for the new runner while its controlled state retained an unavailable old Map, producing invalid run submissions.

**How to apply:** Preserve synchronous identity initialization when refactoring the user switcher. Test with cached data for one runner and a different saved runner, not only a clean first visit.