"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { authClient, emailOtp, signIn } from "@/lib/auth-client";
import { getAuthCallbackURL, getSafeRedirect } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpVerificationForm } from "@/components/otp-verification-form";

type View =
  | "password"
  | "otp-email"
  | "otp-code"
  | "forgot-email"
  | "reset-password";

export function SignIn() {
  const [view, setView] = useState<View>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submittingMethod, setSubmittingMethod] = useState<string | null>(null);
  const isSubmitting = submittingMethod !== null;

  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "";
  const safeRedirect = getSafeRedirect(searchParams.get("redirect") || "");
  const callbackURL = getAuthCallbackURL(safeRedirect);
  const errorCallbackURL =
    safeRedirect === "/"
      ? "/sign-in"
      : `/sign-in?redirect=${encodeURIComponent(safeRedirect)}`;

  const normalizedEmail = () => email.trim().toLowerCase();

  useEffect(() => {
    if (!error) return;
    const message =
      error.toLowerCase() === "unable_to_get_user_info"
        ? "GitHub denied profile access. Re-authorize Pages CMS in your GitHub application settings and try again."
        : error;
    toast.error(message, { duration: 12000 });
  }, [error]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam.trim().toLowerCase());
  }, [searchParams]);

  const switchView = (nextView: View) => {
    setView(nextView);
    setOtp("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleGithubSignIn = async () => {
    setSubmittingMethod("github");
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL,
        errorCallbackURL,
        disableRedirect: true,
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      if (result.data?.url) {
        window.location.assign(result.data.url);
        return;
      }
      toast.error("Could not start GitHub sign-in. Please try again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start GitHub sign-in.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handlePasswordSignIn = async () => {
    const nextEmail = normalizedEmail();
    if (!nextEmail || !password) return;

    setSubmittingMethod("password");
    try {
      const result = await signIn.email({
        email: nextEmail,
        password,
        rememberMe: true,
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      window.location.assign(safeRedirect);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleSendSignInOtp = async () => {
    const nextEmail = normalizedEmail();
    if (!nextEmail) return;

    setSubmittingMethod("send-otp");
    try {
      const result = await emailOtp.sendVerificationOtp({
        email: nextEmail,
        type: "sign-in",
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      setEmail(nextEmail);
      setOtp("");
      setView("otp-code");
      toast.success("If this account exists, we sent a sign-in code.", {
        duration: 8000,
      });
    } catch {
      toast.error("Unable to send a sign-in code.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleOtpSignIn = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }

    setSubmittingMethod("verify-otp");
    try {
      const result = await signIn.emailOtp({ email, otp });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      window.location.assign(safeRedirect);
    } catch {
      toast.error("Unable to verify the code.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleRequestPasswordReset = async () => {
    const nextEmail = normalizedEmail();
    if (!nextEmail) return;

    setSubmittingMethod("request-reset");
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email: nextEmail });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      setEmail(nextEmail);
      setOtp("");
      setView("reset-password");
      toast.success("If this account has a password, we sent a reset code.", {
        duration: 8000,
      });
    } catch {
      toast.error("Unable to request a password reset.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("Password must contain at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmittingMethod("reset-password");
    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Password reset. You can now sign in.");
      switchView("password");
    } catch {
      toast.error("Unable to reset the password.");
    } finally {
      setSubmittingMethod(null);
    }
  };

  const legalCopy = (
    <p className="text-sm text-muted-foreground">
      By clicking continue, you agree to our{" "}
      <a className="underline" href="https://pagescms.org/terms" target="_blank">
        Terms of Service
      </a>{" "}
      and{" "}
      <a className="underline" href="https://pagescms.org/privacy" target="_blank">
        Privacy Policy
      </a>
      .
    </p>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 flex justify-center items-center">
      <div className="sm:max-w-[340px] w-full space-y-6">
        {view === "password" && (
          <>
            <h1 className="text-lg font-medium tracking-tight text-center">
              Sign in to Pages CMS
            </h1>
            <Button
              type="button"
              className="w-full"
              onClick={handleGithubSignIn}
              disabled={isSubmitting}
            >
              <svg role="img" viewBox="0 0 24 24" fill="currentColor">
                <title>GitHub</title>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Sign in with GitHub
              {submittingMethod === "github" && <Loader className="size-4 animate-spin" />}
            </Button>
            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center"><hr className="border-t w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handlePasswordSignIn();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    disabled={isSubmitting}
                    onClick={() => switchView("forgot-email")}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Sign in
                {submittingMethod === "password" && <Loader className="size-4 animate-spin" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => switchView("otp-email")}
              >
                Sign in with an email code
              </Button>
            </form>
          </>
        )}

        {(view === "otp-email" || view === "forgot-email") && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void (view === "otp-email"
                ? handleSendSignInOtp()
                : handleRequestPasswordReset());
            }}
          >
            <div className="space-y-2 text-center">
              <h1 className="text-lg font-medium tracking-tight">
                {view === "otp-email" ? "Sign in with an email code" : "Reset password"}
              </h1>
              <p className="text-sm text-muted-foreground">
                We will send a temporary verification code to your email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Send code
              {(submittingMethod === "send-otp" || submittingMethod === "request-reset") && (
                <Loader className="size-4 animate-spin" />
              )}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => switchView("password")}>
              Back to password sign-in
            </Button>
          </form>
        )}

        {view === "otp-code" && (
          <OtpVerificationForm
            busy={isSubmitting}
            emailLabel={email}
            otp={otp}
            pending={submittingMethod === "verify-otp"}
            resendDisabled={submittingMethod === "verify-otp"}
            resendPending={submittingMethod === "send-otp"}
            onChange={setOtp}
            onResend={() => void handleSendSignInOtp()}
            onSignInAnotherWay={() => switchView("password")}
            onSubmit={(event) => {
              event.preventDefault();
              void handleOtpSignIn();
            }}
          />
        )}

        {view === "reset-password" && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleResetPassword();
            }}
          >
            <div className="space-y-2 text-center">
              <h1 className="text-lg font-medium tracking-tight">Choose a new password</h1>
              <p className="text-sm text-muted-foreground">Enter the code sent to {email}.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Verification code</Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={isSubmitting}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">New password</Label>
              <Input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={isSubmitting}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm new password</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Reset password
              {submittingMethod === "reset-password" && <Loader className="size-4 animate-spin" />}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => switchView("forgot-email")}>
              Request another code
            </Button>
          </form>
        )}

        {legalCopy}
      </div>
    </div>
  );
}
