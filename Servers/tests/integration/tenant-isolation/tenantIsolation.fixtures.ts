/**
 * Per-entity fixtures for the declarative isolation matrix: how to seed a row
 * owned by a tenant, and what to send on update and create. The registry wires
 * each one into `crudEntity(...)`.
 *
 * Imports only the factories, which import only the database module, so the
 * schema-drift audit script can load the registry without the test app.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import type { EntityFixture } from "./tenantIsolation.matrix";
import { createTestTask } from "../../factories";

export const taskFixture: EntityFixture = {
  seed: (ctx) => createTestTask(ctx.orgId, { creator_id: ctx.userId }),
  updatePayload: () => ({ title: "Updated by isolation matrix" }),
  createPayload: (_owner, foreignOrgId) => ({
    title: "Cross-tenant task",
    description: "Should be stamped with the caller's organization",
    organization_id: foreignOrgId,
  }),
};
