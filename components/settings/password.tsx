"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const validatePasswords = (newPassword: string, confirmPassword: string) => {
  if (newPassword.length < 12) return "Password must contain at least 12 characters.";
  if (newPassword !== confirmPassword) return "Passwords do not match.";
  return null;
};

export function PasswordSettings({ initialHasPassword }: { initialHasPassword: boolean }) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const validationError = validatePasswords(newPassword, confirmPassword);
        if (validationError) {
          toast.error(validationError);
          return;
        }

        setPending(true);
        try {
          if (hasPassword) {
            const result = await authClient.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            });
            if (result.error?.message) {
              toast.error(result.error.message);
              return;
            }
            toast.success("Password changed.");
          } else {
            const response = await fetch("/api/account/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ newPassword }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
              toast.error(payload?.error || "Unable to set password.");
              return;
            }
            setHasPassword(true);
            toast.success("Password set. You can now sign in with email and password.");
          }
          resetForm();
        } catch {
          toast.error(hasPassword ? "Unable to change password." : "Unable to set password.");
        } finally {
          setPending(false);
        }
      }}
    >
      {hasPassword && (
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 12 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {hasPassword ? "Change password" : "Set password"}
        {pending && <Loader className="size-4 animate-spin" />}
      </Button>
    </form>
  );
}
