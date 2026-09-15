/**
 * Registry coverage guard (no database access).
 *
 * The schema-drift audit only checks that every tenant-scoped table is in the
 * registry. This checks the next link: every registry entry is actually
 * tested, either by the generated matrix (a `crudEntity(...)` entry) or by a
 * hand-written isolation test file. Without it, an entry could be added with
 * no test at all and both gates would stay green.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import fs from "node:fs";
import { tenantIsolationRegistry } from "./tenantIsolation.registry";
import type { IsolationEntity } from "./tenantIsolation.registry";

const testFiles = new Set(fs.readdirSync(__dirname));

const expectedTestFile = (entity: IsolationEntity): string =>
  entity.testFile ?? `${entity.name.replace(/_/g, "-")}.isolation.test.ts`;

describe("Tenant isolation registry coverage", () => {
  it.each(tenantIsolationRegistry.map((entity) => [entity.name, entity] as const))(
    "%s is covered by the matrix or a hand-written isolation test",
    (_name, entity) => {
      if (entity.matrix) return;
      const file = expectedTestFile(entity);
      if (!testFiles.has(file)) {
        throw new Error(
          `Registry entry "${entity.name}" has no matrix spec and no ${file} in ` +
            "tests/integration/tenant-isolation/. Add it with crudEntity(...) and a fixture, " +
            "write that test file, or point `testFile` at the file that covers it.",
        );
      }
    },
  );

  it("has unique entity names", () => {
    const names = tenantIsolationRegistry.map((entity) => entity.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every matrix entry a primary table that is one of its registered tables", () => {
    for (const entity of tenantIsolationRegistry) {
      if (entity.matrix) expect(entity.tables).toContain(entity.matrix.primaryTable);
    }
  });
});
