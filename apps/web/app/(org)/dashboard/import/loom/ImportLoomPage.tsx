"use client";

import { Button } from "@cap/ui";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { importFromLoom } from "@/actions/loom";
import { useDashboardContext } from "@/app/(org)/dashboard/Contexts";
import { UpgradeModal } from "@/components/UpgradeModal";

export const ImportLoomPage = () => {
	const { user, activeOrganization } = useDashboardContext();
	const router = useRouter();
	const [urlsText, setUrlsText] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [progress, setProgress] = useState<{
		done: number;
		total: number;
		ok: number;
		failed: number;
	} | null>(null);
	const [failedUrls, setFailedUrls] = useState<string[]>([]);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(!user?.isPro);

	const parseUrls = (): string[] => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const raw of urlsText.split(/\s+/)) {
			const u = raw.trim();
			if (!u) continue;
			try {
				if (!new URL(u).hostname.includes("loom.com")) continue;
			} catch {
				continue;
			}
			if (seen.has(u)) continue;
			seen.add(u);
			out.push(u);
		}
		return out;
	};

	const validUrls = parseUrls();

	const handleImport = async () => {
		if (!user || !activeOrganization) return;

		if (!user.isPro) {
			setUpgradeModalOpen(true);
			return;
		}

		const urls = parseUrls();
		if (urls.length === 0) {
			toast.error("Paste at least one valid Loom URL.");
			return;
		}

		setIsImporting(true);
		setFailedUrls([]);
		setProgress({ done: 0, total: urls.length, ok: 0, failed: 0 });

		let ok = 0;
		let failed = 0;
		const failures: string[] = [];

		for (let i = 0; i < urls.length; i++) {
			try {
				const result = await importFromLoom({
					loomUrl: urls[i],
					orgId: activeOrganization.organization.id,
				});
				if (result.success) {
					ok++;
				} else {
					failed++;
					failures.push(urls[i]);
				}
			} catch {
				failed++;
				failures.push(urls[i]);
			}
			setProgress({ done: i + 1, total: urls.length, ok, failed });
		}

		setFailedUrls(failures);
		setIsImporting(false);

		if (failed === 0) {
			toast.success(
				`Started importing ${ok} Loom video${ok === 1 ? "" : "s"}! They'll appear in your caps shortly.`,
			);
			router.push("/dashboard/caps");
		} else {
			toast.error(
				`Started ${ok}, failed ${failed}. Failed URLs are kept below — fix or retry those.`,
			);
			setUrlsText(failures.join("\n"));
		}
	};

	return (
		<div className="flex flex-col w-full h-full">
			<div className="mb-8">
				<Link
					href="/dashboard/import"
					className="inline-flex gap-2 items-center text-sm text-gray-10 hover:text-gray-12 transition-colors mb-4"
				>
					<FontAwesomeIcon className="size-3" icon={faArrowLeft} />
					Back to Import
				</Link>
				<h1 className="text-2xl font-medium text-gray-12">Import from Loom</h1>
				<p className="mt-1 text-sm text-gray-10">
					Paste one or more Loom video URLs (one per line) to import them to Cap.
				</p>
			</div>

			<div className="flex flex-col gap-6 w-full max-w-2xl">
				<div className="flex flex-col gap-4 p-6 rounded-xl border border-gray-3 bg-gray-1">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center size-10 rounded-full bg-gray-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 16 16"
								fill="none"
								role="img"
								aria-label="Loom"
							>
								<path
									fill="#625DF5"
									d="M15 7.222h-4.094l3.546-2.047-.779-1.35-3.545 2.048 2.046-3.546-1.349-.779L8.78 5.093V1H7.22v4.094L5.174 1.548l-1.348.779 2.046 3.545-3.545-2.046-.779 1.348 3.546 2.047H1v1.557h4.093l-3.545 2.047.779 1.35 3.545-2.047-2.047 3.545 1.35.779 2.046-3.546V15h1.557v-4.094l2.047 3.546 1.349-.779-2.047-3.546 3.545 2.047.779-1.349-3.545-2.046h4.093L15 7.222zm-7 2.896a2.126 2.126 0 110-4.252 2.126 2.126 0 010 4.252z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-12">Loom Video URLs</p>
							<p className="text-xs text-gray-10">
								One URL per line. Each video is downloaded and processed in the
								background.
							</p>
						</div>
					</div>

					<textarea
						value={urlsText}
						onChange={(e) => setUrlsText(e.target.value)}
						placeholder={"https://www.loom.com/share/...\nhttps://www.loom.com/share/..."}
						rows={10}
						disabled={isImporting}
						className="w-full rounded-lg border border-gray-3 bg-gray-1 p-3 text-sm font-mono text-gray-12 resize-y focus:outline-none focus:border-gray-8"
					/>

					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-gray-10">
							{validUrls.length} valid URL{validUrls.length === 1 ? "" : "s"}{" "}
							detected
							{progress
								? ` · ${progress.done}/${progress.total} processed (${progress.ok} ok, ${progress.failed} failed)`
								: ""}
						</p>
						<div className="flex gap-3 justify-end">
							<Button
								size="sm"
								variant="gray"
								disabled={isImporting}
								onClick={() => router.push("/dashboard/import")}
							>
								Cancel
							</Button>
							<Button
								onClick={handleImport}
								size="sm"
								spinner={isImporting}
								variant="dark"
								disabled={validUrls.length === 0 || isImporting}
							>
								{isImporting
									? `Importing ${progress?.done ?? 0}/${progress?.total ?? 0}...`
									: `Import ${validUrls.length || ""} video${validUrls.length === 1 ? "" : "s"}`}
							</Button>
						</div>
					</div>

					{failedUrls.length > 0 && !isImporting ? (
						<p className="text-xs text-red-500">
							{failedUrls.length} failed and were kept in the box above so you can
							retry them.
						</p>
					) : null}
				</div>
			</div>

			<UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
		</div>
	);
};
