# Current Work

Source of truth: `04_ROADMAP.md`

Active phase: **Phase 3 remaining deploy** (on hold) / **Phase 4 review-request DoD complete**

## Completed

Phase 1 — Core Reviews and Widget is complete.

Phase 2 — Launch Features is complete.

Phase 3 through Built for Shopify gap recording (deploy/pilot deferred):

- Privacy compliance, rate limits, `/health`, CI, onboarding, ops/BFS docs
- Operator deployment + merchant setup docs (`12_DEPLOYMENT.md`,
  `13_MERCHANT_SETUP.md`)
- Fly host config in repo; live Fly deploy blocked on org billing

Phase 4 review-request DoD is complete:

- Configurable Free/Pro delays + home country
- Multi-product one email per order (Free ≤5 links / Pro all)
- Editable templates + one reminder email
- Settings UI on `/app/review-requests`

## Next

1. Finish Phase 3 pilot when Fly billing is enabled (`12_DEPLOYMENT.md`)
2. Validation gate with real usage before broad Phase 5 work
3. Optional Phase 4 growth candidates only with merchant demand
4. BFS gaps: Flow trigger + customer admin block (`11_APP_STORE_AND_BFS.md`)

Recently completed: customer-gated storefront widget reviews (Path B) with
review-request token flow unchanged (Path A); admin “Add review” test UI
removed.

Future work belongs in the roadmap or ideas backlog, not this file.
