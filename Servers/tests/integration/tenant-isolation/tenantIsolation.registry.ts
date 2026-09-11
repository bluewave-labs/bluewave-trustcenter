/**
 * Tenant isolation registry.
 *
 * This file declares every tenant-scoped entity covered by the cross-tenant
 * isolation test matrix and the schema-drift CI gate.
 *
 * Entries built with `crudEntity(...)` carry a `matrix` spec, and
 * tenantIsolation.matrix.test.ts generates their list / read / update /
 * delete / create isolation tests. Adding a conventional entity is one line
 * here plus a fixture in tenantIsolation.fixtures.ts. Entries without a
 * `matrix` spec are covered by a hand-written `{name}.isolation.test.ts`.
 *
 * The schema-drift audit script imports this file, so it must never import
 * the harness (which loads the whole test app) at runtime.
 *
 * @see docs/technical/security/tenant-isolation.md
 */

import { crudEntity } from "./tenantIsolation.matrix";
import type { MatrixSpec } from "./tenantIsolation.matrix";
import { taskFixture } from "./tenantIsolation.fixtures";

export interface IsolationEntity {
  /** Human-readable entity name (kebab-case). */
  name: string;
  /** Database tables that store this entity's tenant-scoped data. */
  tables: string[];
  /** Base REST route for the entity. */
  baseRoute: string;
  /**
   * Declarative isolation spec. Entries built with `crudEntity(...)` have one
   * and are tested by tenantIsolation.matrix.test.ts.
   */
  matrix?: MatrixSpec;
}

/**
 * Registry of entities covered by the isolation matrix.
 *
 * Keep this list in sync with the per-entity test files under
 * `tests/integration/tenant-isolation/` and with the `sharedTables`
 * allow-list in `scripts/auditTenantIsolationCoverage.ts`.
 */
export const tenantIsolationRegistry: IsolationEntity[] = [
  {
    name: "projects",
    tables: ["projects"],
    baseRoute: "/api/projects",
  },
  {
    name: "files",
    tables: ["files"],
    baseRoute: "/api/files",
  },
  {
    name: "users",
    tables: ["users"],
    baseRoute: "/api/users",
  },
  {
    name: "risks",
    tables: ["risks", "projects_risks"],
    baseRoute: "/api/projectRisks",
  },
  crudEntity("tasks", "/api/tasks", ["tasks", "task_assignees"], taskFixture, {
    updateVerb: "PUT",
  }),
  {
    name: "vendors",
    tables: ["vendors", "vendors_projects"],
    baseRoute: "/api/vendors",
  },
  {
    name: "assessments",
    tables: ["assessments"],
    baseRoute: "/api/assessments",
  },
  {
    name: "controls_eu",
    tables: ["controls_eu", "subcontrols_eu"],
    baseRoute: "/api/eu-ai-act",
  },
  {
    name: "projects_frameworks",
    tables: ["projects_frameworks"],
    baseRoute: "/api/frameworks",
  },
  {
    name: "evidence_hub",
    tables: ["evidence_hub"],
    baseRoute: "/api/evidenceHub",
  },
  {
    name: "audit_ledger",
    tables: ["audit_ledger"],
    baseRoute: "/api/audit-ledger",
  },
  {
    name: "event_logs",
    tables: ["event_logs"],
    baseRoute: "/api/logger/events",
  },
  {
    name: "file_entity_links",
    tables: ["file_entity_links"],
    baseRoute: "/api/files",
  },
  {
    name: "file_change_history",
    tables: ["file_change_history"],
    baseRoute: "/api/file-change-history",
  },
  {
    name: "mrm_validations",
    tables: ["mrm_validations"],
    baseRoute: "/api/mrm/validations",
  },
  {
    name: "mrm_findings",
    tables: ["mrm_findings"],
    baseRoute: "/api/mrm/findings",
  },
  {
    name: "mrm_model_roles",
    tables: ["mrm_model_roles"],
    baseRoute: "/api/mrm/model-roles",
  },
  {
    name: "mrm_metric_keys",
    tables: ["mrm_metric_keys"],
    baseRoute: "/api/mrm/metric-keys",
  },
  {
    name: "mrm_thresholds",
    tables: ["mrm_thresholds"],
    baseRoute: "/api/mrm/thresholds",
  },
  {
    name: "mrm_metrics",
    tables: ["mrm_metrics"],
    baseRoute: "/api/mrm/metrics",
  },
  {
    name: "mrm_metric_evaluations",
    tables: ["mrm_metric_evaluations"],
    baseRoute: "/api/mrm/metric-evaluations",
  },
  {
    name: "mrm_ingestion_tokens",
    tables: ["mrm_ingestion_tokens"],
    baseRoute: "/api/mrm/ingestion-tokens",
  },
  {
    name: "mrm_revalidation_events",
    tables: ["mrm_revalidation_events"],
    baseRoute: "/api/mrm/revalidation-events",
  },
  {
    name: "mrm_org_settings",
    tables: ["mrm_org_settings"],
    baseRoute: "/api/mrm/settings",
  },
  {
    name: "mrm_alert_recipients",
    tables: ["mrm_alert_recipients"],
    baseRoute: "/api/mrm/settings",
  },
  {
    name: "report_templates",
    tables: ["report_templates"],
    baseRoute: "/api/reporting/templates",
  },
  {
    name: "report_runs",
    tables: ["report_runs", "report_run_analyses"],
    baseRoute: "/api/reporting/runs",
  },
  {
    name: "scheduled_reports",
    tables: ["scheduled_reports"],
    baseRoute: "/api/reporting/scheduled-reports",
  },
];

/** Flat set of all tenant-scoped tables declared in the registry. */
export const getRegisteredTenantTables = (): string[] =>
  tenantIsolationRegistry.flatMap((entity) => entity.tables);

/** Registry entry lookup by entity name. */
export const getIsolationEntity = (name: string): IsolationEntity | undefined =>
  tenantIsolationRegistry.find((entity) => entity.name === name);
