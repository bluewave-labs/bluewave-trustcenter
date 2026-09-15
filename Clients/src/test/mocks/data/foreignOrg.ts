/**
 * Records owned by a second organization, for cross-organization tests.
 *
 * The by-id success handlers serve them, the way a backend without tenant
 * scoping would, but list handlers never include them, so existing tests see
 * no extra rows. crossOrgGuard.ts is what turns a request for one of them into
 * a 403. A test without the guard therefore shows exactly what would leak.
 *
 * Each record carries distinctive text so a test can assert it never renders.
 */

import { createMockFile } from "./files";
import { createMockProject } from "./projects";
import { createMockRisk } from "./risks";
import { createMockTask } from "./tasks";

/** The signed-in user's organization; every default fixture belongs to it. */
export const OWN_ORG_ID = 1;
export const FOREIGN_ORG_ID = 2;

export const mockForeignProject = createMockProject({
  id: 9001,
  organization_id: FOREIGN_ORG_ID,
  name: "Org B confidential project",
  description: "Belongs to Org B and must never render for Org A",
});

export const mockForeignRisk = createMockRisk({
  id: 9002,
  organization_id: FOREIGN_ORG_ID,
  title: "Org B confidential risk",
  projectId: mockForeignProject.id,
});

export const mockForeignTask = createMockTask({
  id: 9003,
  organization_id: FOREIGN_ORG_ID,
  title: "Org B confidential task",
});

export const mockForeignFile = createMockFile({
  id: 9004,
  organization_id: FOREIGN_ORG_ID,
  filename: "org-b-confidential.pdf",
});
