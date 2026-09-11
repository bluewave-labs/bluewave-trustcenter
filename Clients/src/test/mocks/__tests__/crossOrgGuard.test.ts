/**
 * Tests for the opt-in cross-organization MSW guard.
 *
 * Requests go through the real customAxios, so the caller's organization
 * travels the same way it does in the app: store → Authorization header →
 * guard.
 */

import { isAxiosError } from "axios";
import CustomAxios from "../../../infrastructure/api/customAxios";
import { server } from "../server";
import { CROSS_ORG_ENTITIES, crossOrgGuard, signInAs, signOut } from "../crossOrgGuard";
import {
  FOREIGN_ORG_ID,
  OWN_ORG_ID,
  mockForeignFile,
  mockForeignProject,
  mockForeignRisk,
  mockForeignTask,
} from "../data/foreignOrg";

async function request(method: "get" | "delete", url: string) {
  try {
    const res = await CustomAxios[method](url);
    return { status: res.status, data: res.data };
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return { status: error.response.status, data: error.response.data };
    }
    throw error;
  }
}

// One row per guarded entity: an own-org and a foreign by-id URL (relative to
// customAxios's /api base), plus the foreign record's distinctive text.
const CASES = [
  {
    name: "projects",
    own: "/projects/1",
    foreign: `/projects/${mockForeignProject.id}`,
    text: mockForeignProject.name,
  },
  {
    name: "risks",
    own: "/projectRisks/1",
    foreign: `/projectRisks/${mockForeignRisk.id}`,
    text: mockForeignRisk.title,
  },
  {
    name: "tasks",
    own: "/tasks/1",
    foreign: `/tasks/${mockForeignTask.id}`,
    text: mockForeignTask.title,
  },
  {
    name: "files",
    own: "/file-manager/1/metadata",
    foreign: `/file-manager/${mockForeignFile.id}/metadata`,
    text: mockForeignFile.filename,
  },
];

describe("crossOrgGuard", () => {
  beforeEach(() => {
    signInAs(OWN_ORG_ID);
  });

  afterEach(() => {
    signOut();
  });

  it("has a test case for every guarded entity", () => {
    expect(CASES.map((c) => c.name).sort()).toEqual(CROSS_ORG_ENTITIES.map((e) => e.name).sort());
  });

  describe.each(CASES)("$name", ({ own, foreign, text }) => {
    it("serves the foreign record when no guard is installed (what would leak)", async () => {
      const res = await request("get", foreign);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.data)).toContain(text);
    });

    it("rejects the foreign record with a 403 envelope", async () => {
      server.use(...crossOrgGuard());

      const res = await request("get", foreign);

      expect(res.status).toBe(403);
      expect(res.data).toEqual({ message: "Forbidden", data: "Access denied" });
      expect(JSON.stringify(res.data)).not.toContain(text);
    });

    it("lets the caller's own record through to the success handler", async () => {
      server.use(...crossOrgGuard());

      const res = await request("get", own);

      expect(res.status).toBe(200);
      expect(res.data.data.organization_id).toBe(OWN_ORG_ID);
    });
  });

  it("guards writes too, on the bare :id path", async () => {
    server.use(...crossOrgGuard());

    const res = await request("delete", `/file-manager/${mockForeignFile.id}`);

    expect(res.status).toBe(403);
  });

  it("falls through for an id it doesn't know", async () => {
    server.use(...crossOrgGuard());

    const res = await request("get", "/projects/424242");

    expect(res.status).toBe(404);
  });

  it("falls through for a literal segment that shares the :id position", async () => {
    server.use(...crossOrgGuard());

    const res = await request("get", "/file-manager/search?q=policy");

    expect(res.status).toBe(200);
  });

  it("decides ownership from the signed-in organization, in both directions", async () => {
    signInAs(FOREIGN_ORG_ID);
    server.use(...crossOrgGuard());

    expect((await request("get", `/projects/${mockForeignProject.id}`)).status).toBe(200);
    expect((await request("get", "/projects/1")).status).toBe(403);
  });

  it("can answer with the backend's real 404 instead of 403", async () => {
    server.use(...crossOrgGuard({ status: 404, detail: "Project not found" }));

    const res = await request("get", `/projects/${mockForeignProject.id}`);

    expect(res.status).toBe(404);
    expect(res.data).toEqual({ message: "Not Found", data: "Project not found" });
  });

  it("uses an explicit callerOrgId when nobody is signed in", async () => {
    signOut();
    server.use(...crossOrgGuard({ callerOrgId: OWN_ORG_ID }));

    expect((await request("get", "/projects/1")).status).toBe(200);
    expect((await request("get", `/projects/${mockForeignProject.id}`)).status).toBe(403);
  });

  it("fails loudly instead of letting everything through when it can't identify the caller", async () => {
    signOut();
    vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(...crossOrgGuard());

    const res = await request("get", `/projects/${mockForeignProject.id}`);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.data)).toContain("no decodable bearer token");
  });

  it.each(["User does not belong to this organization", "Not allowed to access"])(
    "refuses the logout-triggering detail %j",
    (detail) => {
      expect(() => crossOrgGuard({ detail })).toThrow(/log the user out/);
    },
  );
});
