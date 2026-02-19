import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminPanel } from "@/server/actions/admin-panel-actions";
import { AdminPanelDashboard } from "@/components/admin/admin-panel-dashboard";

interface PageProps {
    params: Promise<{ panelId: string }>;
}

export default async function AdminPanelPage(props: PageProps) {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const result = await getAdminPanel(params.panelId);
    if (!result.success || !result.panel) redirect("/dashboard/admin");

    return <AdminPanelDashboard panel={result.panel} />;
}
