/**
 * By-id repositories under the cross-organization guard.
 *
 * For every guarded entity, the repository call the app uses to load one
 * record must reject Org B's record with a 403 and raise exactly one error
 * toast, and still return the caller's own record without one. Adding an
 * entity to the guard means adding a row here; the completeness check fails
 * until you do.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import type { Mock } from "vitest";
import { setShowAlertCallback } from "../../../infrastructure/api/customAxios";
import type { AlertProps } from "../../../presentation/types/alert.types";
import { server } from "../../../test/mocks/server";
import {
  CROSS_ORG_ENTITIES,
  crossOrgGuard,
  signInAs,
  signOut,
} from "../../../test/mocks/crossOrgGuard";
import {
  OWN_ORG_ID,
  mockForeignFile,
  mockForeignProject,
  mockForeignRisk,
  mockForeignTask,
} from "../../../test/mocks/data/foreignOrg";
import { getFileMetadata } from "../file.repository";
import { getProjectById } from "../project.repository";
import { getProjectRiskById } from "../projectRisk.repository";
import { getTaskById } from "../task.repository";

const CASES = [
  {
    name: "projects",
    fetchById: (id: number) => getProjectById({ id: String(id) }),
    recordId: (result: any) => result.data.id,
    foreignId: mockForeignProject.id,
  },
  {
    name: "risks",
    fetchById: (id: number) => getProjectRiskById({ id }),
    recordId: (result: any) => result.data.id,
    foreignId: mockForeignRisk.id,
  },
  {
    name: "tasks",
    fetchById: (id: number) => getTaskById({ id }),
    recordId: (result: any) => result.data.id,
    foreignId: mockForeignTask.id,
  },
  {
    name: "files",
    fetchById: (id: number) => getFileMetadata({ id: String(id) }),
    recordId: (result: any) => Number(result.id),
    foreignId: mockForeignFile.id,
  },
];

const OWN_RECORD_ID = 1;

describe("By-id repositories under the cross-org guard", () => {
  let alerts: Mock<(alert: AlertProps) => void>;

  beforeEach(() => {
    alerts = vi.fn<(alert: AlertProps) => void>();
    setShowAlertCallback(alerts);
    signInAs(OWN_ORG_ID);
    server.use(...crossOrgGuard());
  });

  afterEach(() => {
    signOut();
    setShowAlertCallback(() => {});
  });

  it("has a row for every guarded entity", () => {
    expect(CASES.map((c) => c.name).sort()).toEqual(CROSS_ORG_ENTITIES.map((e) => e.name).sort());
  });

  describe.each(CASES)("$name", ({ fetchById, recordId, foreignId }) => {
    it("rejects Org B's record with a 403 and shows exactly one error toast", async () => {
      await expect(fetchById(foreignId)).rejects.toMatchObject({
        status: 403,
        message: "Access denied",
      });

      expect(alerts).toHaveBeenCalledTimes(1);
      expect(alerts).toHaveBeenCalledWith({
        variant: "error",
        title: "Error",
        body: "Access denied",
      });
    });

    it("returns the caller's own record without a toast", async () => {
      const result = await fetchById(OWN_RECORD_ID);

      expect(recordId(result)).toBe(OWN_RECORD_ID);
      expect(alerts).not.toHaveBeenCalled();
    });
  });
});
