import { vi } from "vitest";

const useAuthMock = vi.fn();
vi.mock("../../../../application/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock("../../../../application/contexts/EvalsSidebar.context", () => ({
  useEvalsSidebarContextSafe: vi.fn().mockReturnValue(null),
}));
vi.mock("../../../../application/contexts/AIDetectionSidebar.context", () => ({
  useAIDetectionSidebarContextSafe: vi.fn().mockReturnValue(null),
}));
vi.mock("../../../../application/contexts/ShadowAISidebar.context", () => ({
  useShadowAISidebarContextSafe: vi.fn().mockReturnValue(null),
}));
vi.mock("../../../../application/contexts/AIGatewaySidebar.context", () => ({
  useAIGatewaySidebarContextSafe: vi.fn().mockReturnValue(null),
}));
vi.mock("../../Sidebar", () => ({
  default: () => <div data-testid="main-sidebar" />,
}));
vi.mock("../../SuperAdminSidebar", () => ({
  default: () => <div data-testid="super-admin-sidebar" />,
}));
vi.mock("../../../pages/EvalsDashboard/EvalsSidebar", () => ({
  default: () => <div data-testid="evals-sidebar" />,
}));
vi.mock("../../../pages/AIDetection/AIDetectionSidebar", () => ({
  default: () => <div data-testid="ai-detection-sidebar" />,
}));
vi.mock("../../../pages/ShadowAI/ShadowAISidebar", () => ({
  default: () => <div data-testid="shadow-ai-sidebar" />,
}));
vi.mock("../../../pages/AIGateway/AIGatewaySidebar", () => ({
  default: () => <div data-testid="ai-gateway-sidebar" />,
}));

import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { ContextSidebar } from "../index";

describe("ContextSidebar", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ isSuperAdmin: false });
  });

  it("renders main sidebar for main module", () => {
    renderWithProviders(<ContextSidebar activeModule="main" />);
    expect(screen.getByTestId("main-sidebar")).toBeInTheDocument();
  });

  it("renders super admin sidebar for super-admin module when user is a SuperAdmin", () => {
    useAuthMock.mockReturnValue({ isSuperAdmin: true });
    renderWithProviders(<ContextSidebar activeModule="super-admin" />);
    expect(screen.getByTestId("super-admin-sidebar")).toBeInTheDocument();
  });

  it("falls back to the main sidebar for super-admin module when user is not a SuperAdmin", () => {
    renderWithProviders(<ContextSidebar activeModule="super-admin" />);
    expect(screen.getByTestId("main-sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("super-admin-sidebar")).not.toBeInTheDocument();
  });
});
