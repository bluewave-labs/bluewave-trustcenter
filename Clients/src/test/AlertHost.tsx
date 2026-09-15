/**
 * Test stand-in for the app's toast host.
 *
 * App.tsx registers `setShowAlertCallback` and renders the current alert as a
 * toast; renderWithProviders doesn't mount App, so global toasts raised by
 * customAxios (e.g. for a 403) would otherwise go nowhere. Render this next to
 * the component under test:
 *
 *   renderWithProviders(<><AlertHost /><Page /></>);
 *
 * It mirrors App.tsx without the 5-second auto-dismiss, so a test can assert on
 * the toast without racing a timer.
 */

import { useEffect, useState } from "react";
import Alert from "../presentation/components/Alert";
import type { AlertProps } from "../presentation/types/alert.types";
import { setShowAlertCallback } from "../infrastructure/api/customAxios";

export function AlertHost() {
  const [alert, setAlert] = useState<AlertProps | null>(null);

  useEffect(() => {
    setShowAlertCallback((alertProps: AlertProps) => setAlert(alertProps));
    return () => setShowAlertCallback(() => {});
  }, []);

  if (!alert) return null;
  return (
    <Alert
      variant={alert.variant}
      title={alert.title}
      body={alert.body}
      isToast={true}
      onClick={() => setAlert(null)}
    />
  );
}
