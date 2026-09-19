# Original app and redesign

## Preserved published baseline

`original-app` preserves commit
`d506aeaca049ade7906f96d4e1242ffdab3fd30d`.
Its deployment-authored Git record identifies build
`76a38c9a-d9aa-4db9-b509-2e4830663012` (September 19, 2026).
This is the exact published commit recorded in the approved plan, not a moving
HEAD selected as a substitute. The deployment service was checked before changes
and reports an active successful public deployment at
https://run-to-the-moon.replit.app.
The service's summary does not expose a commit/build ID; the build-to-commit
mapping is verified from the deployment-authored commit record.

`ui-redesign` is the separate working branch for the redesign.
No publishing is performed as part of this work.

## Switch code locally

Save or commit current work first; do not force checkout or reset.

```sh
git switch original-app
# To return to the redesign:
git switch ui-redesign
```

Restart the API and web workflows after switching. These commands change local
code only. They neither republish nor change the currently deployed app.
The preserved branch should stay at the baseline; create a new branch from it
if making further original-version changes.

## Restore the original deployment

Switch to `original-app`, verify the commit with `git rev-parse HEAD`, restart
and check the original app, then explicitly publish through Replit's Publishing
tool if you decide to restore that code to production. Merely switching a branch
does not restore the live deployment.

## Database boundaries

Git branches do not isolate or restore databases. Both local branches use the
configured development database. Published code uses its configured production
database. Never use branch switching as a data rollback.

The optional leaderboard schema change must remain additive: a boolean with a
false default, without renaming/removing existing fields or changing run
attribution. Original code ignores that extra field and inserts teams using its
database default. Restoring original code must not require deleting leaderboard
data or reversing the additive column. Production migration/publishing remains
a separate explicit action, not part of this redesign.