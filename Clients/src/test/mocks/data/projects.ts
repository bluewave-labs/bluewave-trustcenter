export interface MockProject {
  id: number;
  organization_id: number;
  name: string;
  /** The field the real API returns and the UI renders (e.g. the project view header). */
  project_title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  const name = overrides.name ?? "AI Governance Assessment";
  return {
    id: 1,
    organization_id: 1,
    name,
    // Mirrors `name` unless overridden, so a test asserting on either sees the same text.
    project_title: name,
    description: "Comprehensive AI governance and compliance assessment project",
    status: "active",
    startDate: "2026-01-15T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-05-20T00:00:00Z",
    ...overrides,
  };
}

export const mockProjects: MockProject[] = [
  createMockProject(),
  createMockProject({
    id: 2,
    name: "EU AI Act Compliance",
    description: "Ensuring compliance with the EU Artificial Intelligence Act",
    status: "in_progress",
  }),
  createMockProject({
    id: 3,
    name: "Vendor Risk Review",
    description: "Quarterly vendor risk assessment and mitigation planning",
    status: "pending",
  }),
];
