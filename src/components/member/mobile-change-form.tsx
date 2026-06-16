"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MemberCurrentValueConfirmCard } from "@/components/member/member-current-value-confirm-card";
import { MobileOtpFlow } from "@/components/member/mobile-otp-flow";
import { formatMobile } from "@/lib/utils";

export function MobileChangeForm({
  initialMobile = "",
  verified = false,
  loginIdentifierType,
}: {
  initialMobile?: string;
  verified?: boolean;
  loginIdentifierType?: "mobile" | "email";
}) {
  const router = useRouter();
  const [showEditFlow, setShowEditFlow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const currentMobile = initialMobile.trim();

  const showReadOnlyCard = useMemo(() => {
    if (!currentMobile) return false;
    if (verified) return true;
    return loginIdentifierType === "email" && !showEditFlow;
  }, [currentMobile, loginIdentifierType, showEditFlow, verified]);

  const showConfirmButton = Boolean(currentMobile) && !verified && loginIdentifierType === "email" && !showEditFlow;

  async function confirmCurrentMobile() {
    setIsConfirming(true);
    setMessage(null);

    try {
      const response = await fetch("/api/member/mobile/confirm-current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to confirm current mobile number.");
        return;
      }

      router.refresh();
    } finally {
      setIsConfirming(false);
    }
  }

  if (showReadOnlyCard) {
    return (
      <div className="grid gap-4">
        <MemberCurrentValueConfirmCard
          label="mobile number"
          value={formatMobile(initialMobile)}
          instruction={
            showConfirmButton
              ? "Please click the Confirm button if you want to continue using the same mobile number or click the Edit button if you want to change your mobile number."
              : "Please click the Edit button if you want to change your mobile number."
          }
          showConfirm={showConfirmButton}
          isConfirming={isConfirming}
          onConfirm={() => void confirmCurrentMobile()}
          onEdit={() => {
            setShowEditFlow(true);
            setMessage(null);
          }}
        />
        {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <MobileOtpFlow
        title="Enter your mobile number"
        description="Enter the mobile number you want to verify for your member account."
        mobileLabel="Mobile number"
        initialMobile={verified ? "" : initialMobile}
        requestEndpoint="/api/member/mobile/request-change"
        verifyEndpoint="/api/member/mobile/verify-change"
        verifyButtonLabel="Verify mobile"
        requestPayloadBuilder={(mobile) => ({ newMobile: mobile })}
        onVerified={() => router.refresh()}
      />
      {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
