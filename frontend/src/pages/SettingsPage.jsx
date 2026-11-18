import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function SettingsPage() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Settings</CardTitle>
        <p className="text-sm text-slate-500">
          Account preferences and application settings will be configured here.
        </p>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">Coming soon</Badge>
      </CardContent>
    </Card>
  );
}
