jest.setTimeout(60000);

/**
 * Generated cross-tenant isolation suite.
 *
 * Every registry entry that carries a `matrix` spec (see `crudEntity` in
 * tenantIsolation.matrix.ts) gets one test per op. Each test seeds two fresh
 * tenants; the attacker tries the op against the owner's row, and a positive
 * control proves the owner can do the same thing, so a missing route fails
 * instead of passing as a denial. Skipped ops show up as skipped tests with
 * their reason.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import type { Response } from "supertest";
import { cleanupDatabase } from "../helpers";
import {
  seedTwoTenantContexts,
  assertListOnlyOwnOrg,
  assertReadDenied,
  assertUpdateDenied,
  assertDeleteDenied,
  assertCreatedRowStampedWithCallerOrg,
} from "./tenantIsolation.harness";
import type { TenantContext } from "./tenantIsolation.harness";
import { tenantIsolationRegistry } from "./tenantIsolation.registry";
import type { MatrixOp, MatrixSpec } from "./tenantIsolation.matrix";

async function sendCreate(
  spec: MatrixSpec,
  owner: TenantContext,
  foreignOrgId: number,
): Promise<Response> {
  if (spec.createRequest) return spec.createRequest(owner, foreignOrgId, spec.routes.create);
  if (!spec.createPayload) {
    throw new Error(
      "create is not skipped, but the fixture has neither createRequest nor createPayload",
    );
  }
  return owner.request.post(spec.routes.create).send(await spec.createPayload(owner, foreignOrgId));
}

const OPS: Record<MatrixOp, { title: string; run: (spec: MatrixSpec) => Promise<void> }> = {
  list: {
    title: "lists only rows in the caller's organization",
    run: async (spec) => {
      const { owner, attacker } = await seedTwoTenantContexts();
      await assertListOnlyOwnOrg(
        owner,
        attacker,
        spec.routes.list,
        spec.seed,
        spec.extractItems,
        spec.attackerListStatuses,
      );
    },
  },
  read: {
    title: "denies reading another organization's row (owner control: 200)",
    run: async (spec) => {
      const { owner, attacker } = await seedTwoTenantContexts();
      const id = await spec.seed(owner);
      await assertReadDenied(owner, attacker, spec.routes.read(id), spec.denial.read);
    },
  },
  update: {
    title:
      "denies updating another organization's row and leaves it unchanged (owner control: 2xx)",
    run: async (spec) => {
      const { owner, attacker } = await seedTwoTenantContexts();
      const id = await spec.seed(owner);
      await assertUpdateDenied({
        owner,
        attacker,
        resourceId: id,
        route: spec.routes.update(id),
        table: spec.primaryTable,
        denial: spec.denial.write,
        verb: spec.updateVerb,
        payload: await spec.updatePayload(owner),
      });
    },
  },
  delete: {
    title: "denies deleting another organization's row and leaves it in place (owner control: 2xx)",
    run: async (spec) => {
      const { owner, attacker } = await seedTwoTenantContexts();
      const id = await spec.seed(owner);
      await assertDeleteDenied({
        owner,
        attacker,
        resourceId: id,
        route: spec.routes.delete(id),
        table: spec.primaryTable,
        denial: spec.denial.write,
      });
    },
  },
  create: {
    title: "stamps the caller's organization_id and ignores a foreign one in the body",
    run: async (spec) => {
      const { owner, attacker } = await seedTwoTenantContexts();
      const res = await sendCreate(spec, owner, attacker.orgId);
      await assertCreatedRowStampedWithCallerOrg(
        owner,
        res,
        spec.primaryTable,
        spec.extractCreatedId,
      );
    },
  },
};

const matrixEntities: Array<[string, MatrixSpec]> = tenantIsolationRegistry.flatMap((entity) =>
  entity.matrix ? [[entity.name, entity.matrix] as [string, MatrixSpec]] : [],
);

describe.each(matrixEntities)("%s tenant isolation (matrix)", (_name, spec) => {
  afterEach(async () => {
    await cleanupDatabase();
  });

  for (const [op, { title, run }] of Object.entries(OPS) as Array<
    [MatrixOp, (typeof OPS)[MatrixOp]]
  >) {
    const skipReason = spec.skip[op];
    if (skipReason) {
      it.skip(`${op}: skipped, ${skipReason}`, () => {});
    } else {
      it(`${op}: ${title}`, () => run(spec));
    }
  }
});
