interface SendEmailOtpInput {
  email: string;
  otp: string;
  memberName: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

export async function sendEmailOtp(input: SendEmailOtpInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "support@pclprofile.com";
  const fromName = process.env.RESEND_FROM_NAME ?? "Poona Club";

  if (!apiKey) {
    throw new Error("Resend API key is missing.");
  }

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [input.email],
    subject: "Your Poona Club verification code",
    text: `Hello ${input.memberName}, your Poona Club verification code is ${input.otp}.`,
    html: `<p>Hello ${input.memberName},</p><p>Your <strong>Poona Club</strong> verification code is <strong>${input.otp}</strong>.</p>`,
  };

  let raw = "";
  let status = 0;

  try {
    const response = await withTimeout(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
      6000,
      "Resend email send",
    );

    status = response.status;
    raw = await response.text();

    let parsed: { id?: string; message?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as { id?: string; message?: string }) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok || !parsed.id) {
      console.error(
        JSON.stringify({
          type: "member-email-otp-send-failed",
          provider: "resend",
          fromEmail,
          to: input.email,
          status,
          response: raw || null,
        }),
      );
      throw new Error("Unable to send email OTP. Please try again after some time.");
    }

    return {
      provider: "resend",
      accepted: true,
      requestId: parsed.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error(
      JSON.stringify({
        type: "member-email-otp-send-failed",
        provider: "resend",
        fromEmail,
        to: input.email,
        status: status || null,
        response: raw || null,
        error: message,
      }),
    );
    throw new Error("Unable to send email OTP. Please try again after some time.");
  }
}
