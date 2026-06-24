"use client";

import Link from "next/link";
import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import type {
  BroadcastEmailCampaign,
  BroadcastEmailPreview,
  BroadcastEmailSelectionMode,
  AdminReviewStep,
  AdminSelectionMode,
  MemberDirectoryFilterKey,
  MemberWithVerification,
} from "@/lib/types";
import { cn, formatMobile } from "@/lib/utils";

const TEMPLATE_SUBJECT = "Complete your Poona Club verification";
const SHOW_BULK_EMAIL = false;
const TEMPLATE_SAMPLE = {
  html: `<p>Hi Member,</p><p>This is a reminder to complete your Poona Club verification on <a href="https://www.pclprofile.com">pclprofile.com</a>.</p><p>Please log in with your registered email address or mobile number and finish the pending steps at the earliest.</p><p>Thank you,<br />Poona Club</p>`,
  text: "Hi Member,\n\nThis is a reminder to complete your Poona Club verification on https://www.pclprofile.com. Please log in with your registered email address or mobile number and finish the pending steps at the earliest.\n\nThank you,\nPoona Club",
};

export function MemberDirectory({
  members,
  counts,
  total,
  currentPage,
  pageSize,
  query,
  filters,
  view,
  sort,
}: {
  members: MemberWithVerification[];
  counts: { all: number; verified: number; approved: number; disapproved: number; inprogress: number; notstarted: number; shared: number };
  total: number;
  currentPage: number;
  pageSize: number;
  query: string;
  filters: MemberDirectoryFilterKey[];
  view: "grid" | "list";
  sort: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [currentMembers, setCurrentMembers] = useState(members);
  const [currentCounts, setCurrentCounts] = useState(counts);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<BroadcastEmailCampaign[]>([]);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(false);
  const [showRecentCampaigns, setShowRecentCampaigns] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<BroadcastEmailSelectionMode>("selected_visible");
  const [preview, setPreview] = useState<BroadcastEmailPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);
  const [selectionModeForActions, setSelectionModeForActions] = useState<AdminSelectionMode>("selected_ids");
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveSteps, setDisapproveSteps] = useState<AdminReviewStep[]>([]);
  const [disapproveMessage, setDisapproveMessage] = useState("");

  const pageCount = Math.max(1, Math.ceil(currentTotal / pageSize));
  const visibleIds = useMemo(() => currentMembers.map((member) => member.id), [currentMembers]);
  const selectedVisibleCount = selectedIds.filter((id) => visibleIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const actionSelectionCount = selectionModeForActions === "all_filtered" ? currentTotal : selectedIds.length;

  const loadCampaigns = useCallback(async () => {
    setIsCampaignsLoading(true);
    setCampaignError(null);
    try {
      const response = await fetch("/api/admin/members/bulk-email/campaigns", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setCampaignError(payload.error ?? "Unable to load email campaigns right now.");
        return;
      }
      setCampaigns(payload.campaigns ?? []);
    } catch {
      setCampaignError("Unable to load email campaigns right now.");
    } finally {
      setIsCampaignsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentPage > 1) params.set("page", String(currentPage));
      if (query) params.set("q", query);
      if (filters.length) params.set("filters", filters.join(","));
      if (view !== "grid") params.set("view", view);
      if (sort !== "name_asc") params.set("sort", sort);
      const response = await fetch(`/api/admin/members${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh members right now. Please try again.");
        return;
      }
      const nextMembers = payload.members ?? [];
      setCurrentMembers(nextMembers);
      setCurrentCounts(payload.counts ?? currentCounts);
      setCurrentTotal(payload.total ?? currentTotal);
      setSelectedIds((prev) => prev.filter((id) => nextMembers.some((member: MemberWithVerification) => member.id === id)));
      if (showRecentCampaigns) {
        await loadCampaigns();
      }
    } catch {
      setError("Unable to refresh members right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPage, currentCounts, currentTotal, filters, isRefreshing, loadCampaigns, query, showRecentCampaigns, sort, view]);

  useVisiblePolling(60000, refresh);
  useVisiblePolling(60000, async () => {
    if (showRecentCampaigns) {
      await loadCampaigns();
    }
  });

  useEffect(() => {
    if (!showRecentCampaigns) return;
    const timer = window.setTimeout(() => {
      void loadCampaigns();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCampaigns, showRecentCampaigns]);

  function updateParams(next: {
    page?: number;
    q?: string;
    filters?: MemberDirectoryFilterKey[];
    view?: "grid" | "list";
    sort?: string;
  }) {
    const params = new URLSearchParams();
    const nextPage = next.page ?? currentPage;
    const nextQuery = next.q ?? query;
    const nextFilters = next.filters ?? filters;
    const nextView = next.view ?? view;
    const nextSort = next.sort ?? sort;

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextQuery) params.set("q", nextQuery);
    if (nextFilters.length) params.set("filters", nextFilters.join(","));
    if (nextView !== "grid") params.set("view", nextView);
    if (nextSort !== "name_asc") params.set("sort", nextSort);

    router.push(`/admin/members${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const filterOptions = [
    { value: "inprogress" as const, label: "In Progress", count: currentCounts.inprogress },
    { value: "verified" as const, label: "Verified", count: currentCounts.verified },
    { value: "approved" as const, label: "Approved", count: currentCounts.approved },
    { value: "disapproved" as const, label: "Disapproved", count: currentCounts.disapproved },
    { value: "notstarted" as const, label: "Not Started", count: currentCounts.notstarted },
    { value: "shared" as const, label: "Shared mobile", count: currentCounts.shared },
  ];

  function toggleSelected(id: string) {
    setSelectionModeForActions("selected_ids");
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      setSelectionModeForActions("selected_ids");
      return [...new Set([...prev, ...visibleIds])];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
    setSelectionModeForActions("selected_ids");
    setActionMessage(null);
  }

  function getReviewPayload(action: "approve" | "disapprove", extra?: { steps?: AdminReviewStep[]; message?: string; selectedIdsOverride?: string[] }) {
    const ids = extra?.selectedIdsOverride ?? selectedIds;
    return {
      action,
      selectionMode: extra?.selectedIdsOverride ? "selected_ids" : selectionModeForActions,
      selectedIds: extra?.selectedIdsOverride || selectionModeForActions === "selected_ids" ? ids : undefined,
      query,
      filters,
      ...(extra?.steps ? { steps: extra.steps } : {}),
      ...(extra?.message !== undefined ? { message: extra.message } : {}),
    };
  }

  async function submitReview(action: "approve" | "disapprove", extra?: { steps?: AdminReviewStep[]; message?: string; selectedIdsOverride?: string[] }) {
    if (!extra?.selectedIdsOverride && selectionModeForActions === "selected_ids" && selectedIds.length === 0) return;
    setIsReviewSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/members/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getReviewPayload(action, extra)),
      });
      const payload = await response.json();
      if (!response.ok) {
        setActionMessage(payload.error ?? "Unable to update admin review status.");
        return;
      }
      const nextMessage = payload.message ?? "Admin review status updated.";
      setDisapproveOpen(false);
      setDisapproveSteps([]);
      setDisapproveMessage("");
      clearSelection();
      setActionMessage(nextMessage);
      await refresh();
    } catch {
      setActionMessage("Unable to update admin review status.");
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  async function downloadExcel() {
    if (selectionModeForActions === "selected_ids" && selectedIds.length === 0) return;
    setIsExcelDownloading(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/admin/members/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionMode: selectionModeForActions,
          selectedIds: selectionModeForActions === "selected_ids" ? selectedIds : undefined,
          query,
          filters,
        }),
      });
      if (!response.ok) {
        setActionMessage("Unable to prepare Excel download.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poona-club-members-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionMessage("Unable to prepare Excel download.");
    } finally {
      setIsExcelDownloading(false);
    }
  }

  function getPrintHref() {
    const params = new URLSearchParams();
    params.set("selectionMode", selectionModeForActions);
    if (selectionModeForActions === "selected_ids") params.set("ids", selectedIds.join(","));
    if (query) params.set("q", query);
    if (filters.length) params.set("filters", filters.join(","));
    return `/admin/members/export/cards${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function getMemberStatus(member: MemberWithVerification) {
    const reviewStatus = member.verification.adminReviewStatus ?? "pending";
    if (reviewStatus === "approved") return { label: "Admin approved", tone: "success" as const };
    if (reviewStatus === "disapproved") return { label: "Admin disapproved", tone: "danger" as const };
    if (member.verification.completed) return { label: "Verified", tone: "success" as const };
    const started = member.verification.mobileVerified || member.verification.emailVerified || member.verification.selfieUploaded;
    return { label: started ? "In progress" : "Not started", tone: "warning" as const };
  }

  function getStepChip(member: MemberWithVerification, step: AdminReviewStep) {
    const reviewStatus = member.verification.adminReviewStatus ?? "pending";
    const rejected = member.verification.adminRejectionSteps?.includes(step);
    if (reviewStatus === "approved") return { label: `${step === "selfie" ? "Selfie" : step === "mobile" ? "Mobile" : "Email"} admin approved`, tone: "success" as const };
    if (rejected) return { label: `${step === "selfie" ? "Selfie" : step === "mobile" ? "Mobile" : "Email"} rejected`, tone: "danger" as const };
    if (step === "mobile") return { label: member.verification.mobileVerified ? "Mobile verified" : "Mobile pending", tone: member.verification.mobileVerified ? "success" as const : "warning" as const };
    if (step === "email") return { label: member.verification.emailVerified ? "Email verified" : "Email pending", tone: member.verification.emailVerified ? "success" as const : "warning" as const };
    return { label: member.verification.selfieUploaded ? "Selfie uploaded" : "Selfie pending", tone: member.verification.selfieUploaded ? "success" as const : "warning" as const };
  }

  async function openCampaignModal(mode: BroadcastEmailSelectionMode) {
    setSelectionMode(mode);
    setIsModalOpen(true);
    setPreview(null);
    setPreviewError(null);
    setIsPreviewLoading(true);
    try {
      const response = await fetch("/api/admin/members/bulk-email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionMode: mode,
          selectedIds: mode === "selected_visible" ? selectedIds : undefined,
          query,
          filters,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setPreviewError(payload.error ?? "Unable to prepare the email preview.");
        return;
      }
      setPreview(payload);
    } catch {
      setPreviewError("Unable to prepare the email preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function createCampaign() {
    setIsSubmittingCampaign(true);
    setPreviewError(null);
    try {
      const response = await fetch("/api/admin/members/bulk-email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectionMode,
          selectedIds: selectionMode === "selected_visible" ? selectedIds : undefined,
          query,
          filters,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setPreviewError(payload.error ?? "Unable to create the email campaign.");
        return;
      }
      setCampaigns((prev) => [payload.campaign, ...prev].slice(0, 6));
      setIsModalOpen(false);
      setPreview(null);
      setSelectedIds([]);
      await loadCampaigns();
    } catch {
      setPreviewError("Unable to create the email campaign.");
    } finally {
      setIsSubmittingCampaign(false);
    }
  }

  return (
    <>
      <div className="grid gap-5">
        <div className="shell-panel rounded-[24px] p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateParams({ filters: [], page: 1 })}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                  filters.length === 0
                    ? "border-[#6f84ba] bg-[#3c589e] text-white"
                    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
                )}
              >
                <span>All members</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", filters.length === 0 ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{currentCounts.all}</span>
              </button>

              {filterOptions.map((option) => {
                const isActive = filters.length === 1 && filters[0] === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateParams({ filters: isActive ? [] : [option.value], page: 1 })}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                      isActive
                        ? "border-[#6f84ba] bg-[#3c589e] text-white"
                        : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
                    )}
                  >
                    <span>{option.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isActive ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{option.count}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:opacity-60 lg:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member directory</p>
            <label htmlFor="member-search" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Search by member name, membership ID, mobile number or email address
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                <input
                  id="member-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") updateParams({ q: search.trim(), page: 1 });
                  }}
                  placeholder="Search members"
                  className="w-full flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
                />
                <button
                  onClick={() => updateParams({ q: search.trim(), page: 1 })}
                  className="h-12 rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]"
                >
                  Search
                </button>
                <button
                  onClick={() => {
                    setSearch("");
                    updateParams({ q: "", page: 1, filters: filters.length ? filters : [] });
                  }}
                  className="h-12 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Combine filters to narrow the list, such as pending members with shared mobile numbers.
            </p>
          </div>
        </div>

        {SHOW_BULK_EMAIL ? (
          <div className="soft-card rounded-[24px] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Bulk email</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Select visible members or send a reminder to all members in the current filtered result set.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={toggleSelectVisible} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                  {allVisibleSelected ? "Clear visible" : "Select visible"}
                </button>
                <button disabled={!selectedIds.length} onClick={() => void openCampaignModal("selected_visible")} className="rounded-full bg-[#3c589e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:cursor-not-allowed disabled:opacity-50">
                  Email selected ({selectedIds.length})
                </button>
                <button disabled={currentTotal === 0} onClick={() => void openCampaignModal("all_filtered")} className="rounded-full border border-[#6f84ba] bg-[#eef2fb] px-4 py-2 text-sm font-semibold text-[#3c589e] hover:bg-[#dfe7f8] disabled:cursor-not-allowed disabled:opacity-50">
                  Email all filtered ({currentTotal})
                </button>
                <button
                  onClick={() => setShowRecentCampaigns((current) => !current)}
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
                >
                  {showRecentCampaigns ? "Hide recent campaigns" : "Recent campaigns"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {SHOW_BULK_EMAIL && showRecentCampaigns ? (
          <div className="soft-card rounded-[24px] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Recent campaigns</p>
                <h2 className="mt-2 text-xl font-semibold">Email send progress</h2>
              </div>
              {isCampaignsLoading ? <p className="text-sm text-[var(--muted)]">Updating...</p> : null}
            </div>
            {campaigns.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No bulk email campaigns have been created yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{campaign.subject}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{campaign.selectionMode === "all_filtered" ? "All filtered results" : "Selected visible members"}</p>
                      </div>
                      <StatusChip label={campaign.status.replaceAll("_", " ")} tone={campaign.status === "completed" ? "success" : campaign.status === "completed_with_errors" || campaign.status === "failed" ? "danger" : "warning"} />
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                      <p>Valid recipients: <span className="font-semibold text-[var(--foreground)]">{campaign.totalValid}</span></p>
                      <p>Skipped: <span className="font-semibold text-[var(--foreground)]">{campaign.totalSkipped}</span></p>
                      <p>Batches: <span className="font-semibold text-[var(--foreground)]">{campaign.batchesCompleted}/{campaign.totalBatches}</span></p>
                      <p>Accepted by Resend: <span className="font-semibold text-[var(--foreground)]">{campaign.sentToProviderCount}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {campaignError ? <p className="mt-3 text-sm font-semibold text-red-600">{campaignError}</p> : null}
          </div>
        ) : null}

        <div className="soft-card rounded-[24px] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Selection</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {selectionModeForActions === "all_filtered"
                  ? `All ${currentTotal} members matching this search/filter are selected.`
                  : `${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"} selected.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleSelectVisible} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                {allVisibleSelected ? "Clear visible" : "Select visible page"}
              </button>
              <button disabled={currentTotal === 0} onClick={() => setSelectionModeForActions("all_filtered")} className="rounded-full border border-[#6f84ba] bg-[#eef2fb] px-4 py-2 text-sm font-semibold text-[#3c589e] hover:bg-[#dfe7f8] disabled:cursor-not-allowed disabled:opacity-50">
                Select all filtered ({currentTotal})
              </button>
              <button disabled={!selectedIds.length && selectionModeForActions !== "all_filtered"} onClick={clearSelection} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:cursor-not-allowed disabled:opacity-50">
                Clear selection
              </button>
            </div>
          </div>
        </div>

        {actionSelectionCount > 0 ? (
          <div className="soft-card rounded-[24px] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Bulk actions</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Actions apply to {actionSelectionCount} selected member{actionSelectionCount === 1 ? "" : "s"}.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={isReviewSubmitting} onClick={() => void submitReview("approve")} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isReviewSubmitting ? "Updating..." : "Bulk approve"}
                </button>
                <button disabled={isReviewSubmitting} onClick={() => setDisapproveOpen(true)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                  Bulk disapprove
                </button>
                <button disabled={isExcelDownloading} onClick={() => void downloadExcel()} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:cursor-not-allowed disabled:opacity-50">
                  {isExcelDownloading ? "Preparing..." : "Download Excel"}
                </button>
                <Link href={getPrintHref()} target="_blank" className="rounded-full border border-[#6f84ba] bg-[#eef2fb] px-4 py-2 text-sm font-semibold text-[#3c589e] hover:bg-[#dfe7f8]">
                  Print/export cards
                </Link>
              </div>
            </div>
            {actionMessage ? <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{actionMessage}</p> : null}
          </div>
        ) : null}

        {actionSelectionCount === 0 && actionMessage ? (
          <p className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{actionMessage}</p>
        ) : null}

        <div className="flex justify-end">
          <div className="grid w-full grid-cols-2 gap-3 md:w-[260px]">
            <button onClick={() => updateParams({ view: "grid" })} className={cn("h-12 rounded-2xl border px-4 py-3 text-sm font-medium", view === "grid" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]")}>Grid</button>
            <button onClick={() => updateParams({ view: "list" })} className={cn("h-12 rounded-2xl border px-4 py-3 text-sm font-medium", view === "list" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]")}>List</button>
          </div>
        </div>

        <div className={cn("grid gap-4", view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {currentMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);
            const memberStatus = getMemberStatus(member);
            const mobileChip = getStepChip(member, "mobile");
            const emailChip = getStepChip(member, "email");
            const selfieChip = getStepChip(member, "selfie");
            return (
              <article key={member.id} className={cn("soft-card rounded-[24px] p-5", isSelected && "ring-2 ring-[#6f84ba]", view === "list" && "md:flex md:items-start md:justify-between md:gap-6")}>
                {view === "grid" ? (
                  <>
                    <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb]">
                      <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} className="h-56 w-full rounded-none ring-0" />
                    </div>
                    <div className="mt-4 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold text-[var(--foreground)]">{member.fullName}</h3>
                        </div>
                        <StatusChip label={memberStatus.label} tone={memberStatus.tone} />
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                      <div className="mt-4 space-y-2 text-sm">
                        <p className="text-[var(--muted)]">{member.email}</p>
                        <p className="font-medium text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <StatusChip label={mobileChip.label} tone={mobileChip.tone} />
                          <StatusChip label={emailChip.label} tone={emailChip.tone} />
                          <StatusChip label={selfieChip.label} tone={selfieChip.tone} />
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(member.id)} className="h-4 w-4 rounded border-[var(--border)] text-[#3c589e]" />
                          Select member
                        </label>
                        <div className="flex gap-2">
                          <button disabled={isReviewSubmitting} onClick={() => void submitReview("approve", { selectedIdsOverride: [member.id] })} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Approve</button>
                          <button disabled={isReviewSubmitting} onClick={() => { setSelectionModeForActions("selected_ids"); setSelectedIds([member.id]); setDisapproveOpen(true); }} className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">Disapprove</button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <div className="flex gap-4">
                      <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">{member.fullName}</h3>
                          <StatusChip label={memberStatus.label} tone={memberStatus.tone} />
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                        <p className="mt-3 text-sm text-[var(--muted)]">{member.email}</p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusChip label={mobileChip.label} tone={mobileChip.tone} />
                          <StatusChip label={emailChip.label} tone={emailChip.tone} />
                          <StatusChip label={selfieChip.label} tone={selfieChip.tone} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(member.id)} className="h-4 w-4 rounded border-[var(--border)] text-[#3c589e]" />
                        Select member
                      </label>
                      <div className="flex gap-2">
                        <button disabled={isReviewSubmitting} onClick={() => void submitReview("approve", { selectedIdsOverride: [member.id] })} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Approve</button>
                        <button disabled={isReviewSubmitting} onClick={() => { setSelectionModeForActions("selected_ids"); setSelectedIds([member.id]); setDisapproveOpen(true); }} className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50">Disapprove</button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {currentMembers.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted)]">
            No members match this search. Try a different name, membership ID, or mobile number.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, currentTotal)} of {currentTotal} members
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
            <button disabled={currentPage === pageCount} onClick={() => updateParams({ page: Math.min(pageCount, currentPage + 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
          </div>
        </div>
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      </div>

      {disapproveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 px-4 py-8">
          <div className="w-full max-w-xl rounded-[28px] bg-[#f8f9fc] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-red-600">Admin disapproval</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Select items to mark pending</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The member will see the existing record with a rejection message and instructions to update it again.</p>
              </div>
              <button onClick={() => setDisapproveOpen(false)} className="rounded-full border border-[var(--border)] bg-white p-2 text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {([
                ["selfie", "Selfie image"],
                ["mobile", "Mobile number"],
                ["email", "Email"],
              ] as Array<[AdminReviewStep, string]>).map(([value, label]) => {
                const checked = disapproveSteps.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDisapproveSteps((current) => (current.includes(value) ? current.filter((step) => step !== value) : [...current, value]))}
                    className={cn(
                      "rounded-[20px] border px-4 py-4 text-left text-sm font-semibold",
                      checked ? "border-red-300 bg-red-50 text-red-700" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-red-200 hover:bg-red-50",
                    )}
                  >
                    <span className="block">{label}</span>
                    <span className="mt-2 block text-xs font-medium text-[var(--muted)]">{checked ? "Selected" : "Click to select"}</span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 grid gap-2 text-sm font-medium text-[var(--foreground)]">
              Optional admin message
              <textarea
                value={disapproveMessage}
                onChange={(event) => setDisapproveMessage(event.target.value)}
                rows={4}
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
                placeholder="Explain what needs to be corrected."
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setDisapproveOpen(false)} className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                Cancel
              </button>
              <button disabled={isReviewSubmitting || disapproveSteps.length === 0} onClick={() => void submitReview("disapprove", { steps: disapproveSteps, message: disapproveMessage })} className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isReviewSubmitting ? "Updating..." : "Confirm disapproval"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[28px] bg-[#f8f9fc] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Verification reminder</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Review bulk email campaign</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full border border-[var(--border)] bg-white p-2 text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Mode</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{selectionMode === "all_filtered" ? "All filtered results" : "Selected visible members"}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Subject</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{TEMPLATE_SUBJECT}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Current filter size</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{currentTotal} members</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Resolved</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{preview?.totalResolved ?? "--"}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Valid emails</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{preview?.totalValid ?? "--"}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#3c589e]">Skipped</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{preview?.totalSkipped ?? "--"}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Sample recipients</h3>
                {isPreviewLoading ? <p className="mt-3 text-sm text-[var(--muted)]">Preparing recipient preview...</p> : null}
                {!isPreviewLoading && preview?.samples.length ? (
                  <div className="mt-4 space-y-3">
                    {preview.samples.map((sample) => (
                      <div key={`${sample.profileId}-${sample.email}`} className="rounded-[18px] border border-[var(--border)] bg-[#f8f9fc] px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">{sample.fullName}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{sample.email}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Template preview</h3>
                <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{TEMPLATE_SUBJECT}</p>
                <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[#f8f9fc] p-4 text-sm leading-6 text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: TEMPLATE_SAMPLE.html }} />
              </div>
            </div>

            {previewError ? <p className="mt-4 text-sm font-semibold text-red-600">{previewError}</p> : null}

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
              <button onClick={() => setIsModalOpen(false)} className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                Cancel
              </button>
              <button disabled={isPreviewLoading || isSubmittingCampaign || !preview || preview.totalValid === 0} onClick={() => void createCampaign()} className="rounded-full bg-[#3c589e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmittingCampaign ? "Creating campaign..." : `Start send for ${preview?.totalValid ?? 0} emails`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
