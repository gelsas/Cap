import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { organizationMembers, organizations } from "@cap/database/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsNav } from "./_components/SettingsNav";

export default async function OrganizationSettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/auth/signin");
	}

	const [member] = await db()
		.select({
			role: organizationMembers.role,
		})
		.from(organizationMembers)
		.leftJoin(
			organizations,
			eq(organizationMembers.organizationId, organizations.id),
		)
		.where(
			and(
				eq(organizationMembers.userId, user.id),
				eq(organizations.id, user.activeOrganizationId),
			),
		)
		.limit(1);

		const inviteAllowlist = (process.env.INVITE_ALLOWED_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	const emailAllowed =
		!!user.email && inviteAllowlist.includes(user.email.toLowerCase());

	if (!member || (member.role !== "owner" && !emailAllowed)) {
		redirect("/dashboard/caps");
	}

	return (
		<div className="flex flex-col gap-6">
			<SettingsNav />
			{children}
		</div>
	);
}
