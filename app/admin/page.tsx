import AdminShell from "./admin-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Editor",
  description: "Kelola catatan perjalanan Jejak Farras.",
};

export default function AdminPage() {
  return <AdminShell />;
}
