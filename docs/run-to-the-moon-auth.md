# Run to the Moon account handoff

Run to the Moon uses Replit-managed Clerk. Development and published deployments use separate Clerk user stores, so accounts created in one environment do not exist in the other. Claim codes belong to the app database in the environment where they are generated.

## Give an existing runner a claim code

Run this only from a protected Replit shell for the target environment:

```sh
pnpm --filter @workspace/api-server generate-claim-code -- <runner-id>
```

The command prints the plaintext code once. Deliver it privately to that runner. The database stores only its SHA-256 hash. The code cannot be regenerated, transferred, or reused after a successful claim.

Do not put claim codes in source files, shared documents, workflow commands, or production logs.

## New runners

A signed-in account that has no mapped runner can create a new runner from the onboarding screen. Existing runners should use their one-time code so their historical runs, maps, teams, stamps, streaks, and activity settings stay attached.