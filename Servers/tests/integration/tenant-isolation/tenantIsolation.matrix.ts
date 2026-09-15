/**
 * Declarative cross-tenant isolation matrix.
 *
 * A registry entry built with `crudEntity(...)` carries a `matrix` spec, and
 * tenantIsolation.matrix.test.ts turns every such entry into the full set of
 * list / read / update / delete / create isolation tests. Adding a
 * conventional entity is one `crudEntity(...)` line in the registry plus a
 * fixture in tenantIsolation.fixtures.ts.
 *
 * This module must stay free of runtime imports from the harness: the
 * schema-drift audit script imports the registry, and the harness pulls in the
 * whole test app. Type-only imports are erased at compile time.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import type { Response } from "supertest";
import type { TenantContext } from "./tenantIsolation.harness";
import type { IsolationEntity } from "./tenantIsolation.registry";

export type MatrixOp = "list" | "read" | "update" | "delete" | "create";
export type UpdateVerb = "PUT" | "PATCH";

type Payload = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;

/** Entity-specific data the matrix needs: how to seed a row and what to send. */
export interface EntityFixture {
  /** Insert one row owned by `ctx` and return its id. */
  seed: (ctx: TenantContext) => Promise<number>;
  /** Update body. Must be valid: the owner's positive control sends it too. */
  updatePayload: (owner: TenantContext) => MaybePromise<Payload>;
  /**
   * Create body. It should carry `foreignOrgId` as `organization_id`, which the
   * server must ignore. Omit only when the create op is skipped or
   * `createRequest` is given.
   */
  createPayload?: (owner: TenantContext, foreignOrgId: number) => MaybePromise<Payload>;
  /**
   * Custom create request, for endpoints a JSON body can't reach (e.g. a
   * multipart upload). Takes precedence over `createPayload`, and must send
   * `foreignOrgId` as `organization_id` the same way.
   */
  createRequest?: (owner: TenantContext, foreignOrgId: number, route: string) => Promise<Response>;
}

export interface MatrixSpec extends EntityFixture {
  /** Table the seeded id lives in; used by the unchanged-row and create checks. */
  primaryTable: string;
  routes: {
    list: string;
    read: (id: number) => string;
    update: (id: number) => string;
    delete: (id: number) => string;
    create: string;
  };
  /** The verb the update route really has. Sending the other one hits no route. */
  updateVerb: UpdateVerb;
  /** Statuses that count as a denial for the attacker. */
  denial: { read: number[]; write: number[] };
  /** Statuses accepted for the attacker's list, which must hold no rows. */
  attackerListStatuses: number[];
  extractItems: (res: Response) => unknown[];
  extractCreatedId: (res: Response) => number | undefined;
  /** Ops that cannot be exercised, each with the reason. Reported as skipped tests. */
  skip: Partial<Record<MatrixOp, string>>;
}

export interface CrudEntityOverrides {
  updateVerb?: UpdateVerb;
  primaryTable?: string;
  routes?: Partial<MatrixSpec["routes"]>;
  denial?: Partial<MatrixSpec["denial"]>;
  /** For lists that answer an empty result with something other than 200 (e.g. 204). */
  attackerListStatuses?: number[];
  extractItems?: MatrixSpec["extractItems"];
  extractCreatedId?: MatrixSpec["extractCreatedId"];
  skip?: MatrixSpec["skip"];
}

/** A foreign id reads as not found; a foreign write may also be forbidden. */
const DEFAULT_DENIAL: MatrixSpec["denial"] = { read: [404], write: [403, 404] };

/**
 * The list body itself, its `data`, or the first array-valued property of
 * `data` (e.g. `{ data: { tasks: [...] } }`). An unrecognised shape yields `[]`,
 * which fails the owner's "sees at least one row" check rather than passing.
 */
export function defaultExtractItems(res: Response): unknown[] {
  const body = res.body;
  if (Array.isArray(body)) return body;
  const data = body?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nested = Object.values(data).find(Array.isArray);
    if (nested) return nested as unknown[];
  }
  return [];
}

export function defaultExtractCreatedId(res: Response): number | undefined {
  return res.body?.data?.id ?? res.body?.id;
}

/**
 * Build a registry entry for an entity whose REST surface follows the usual
 * shape: `GET base`, `GET | <updateVerb> | DELETE base/:id`, `POST base`.
 * Update defaults to PATCH; pass `{ updateVerb: "PUT" }` for PUT-only routes,
 * and `routes` for any op that lives elsewhere.
 */
export function crudEntity(
  name: string,
  baseRoute: string,
  tables: string[],
  fixture: EntityFixture,
  overrides: CrudEntityOverrides = {},
): IsolationEntity {
  const byId = (id: number) => `${baseRoute}/${id}`;
  return {
    name,
    tables,
    baseRoute,
    matrix: {
      ...fixture,
      primaryTable: overrides.primaryTable ?? tables[0],
      routes: {
        list: baseRoute,
        read: byId,
        update: byId,
        delete: byId,
        create: baseRoute,
        ...overrides.routes,
      },
      updateVerb: overrides.updateVerb ?? "PATCH",
      denial: { ...DEFAULT_DENIAL, ...overrides.denial },
      attackerListStatuses: overrides.attackerListStatuses ?? [200],
      extractItems: overrides.extractItems ?? defaultExtractItems,
      extractCreatedId: overrides.extractCreatedId ?? defaultExtractCreatedId,
      skip: overrides.skip ?? {},
    },
  };
}
