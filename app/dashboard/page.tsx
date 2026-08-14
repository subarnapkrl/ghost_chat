import { redirect } from "next/navigation";
import { auth } from "../../auth";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <DashboardClient chatName={session.user.chatName} />;
}
