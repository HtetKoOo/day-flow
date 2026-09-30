"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.15c1.84-1.7 2.9-4.2 2.9-7.28Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.62 0 4.82-.87 6.43-2.24l-3.15-2.51c-.87.59-1.99.94-3.28.94-2.53 0-4.68-1.71-5.45-4v2.59H3.3A9.72 9.72 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M6.55 13.94a5.85 5.85 0 0 1 0-3.88V7.47H3.3a9.76 9.76 0 0 0 0 9.06l3.25-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.06c1.43 0 2.71.49 3.72 1.46l2.8-2.8C16.82 3.14 14.62 2.25 12 2.25A9.72 9.72 0 0 0 3.3 7.47l3.25 2.59c.77-2.29 2.92-4 5.45-4Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);
    setMessage("");

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (error) {
      setMessage("Unable to continue with Google. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={disabled || pending}
        onClick={signInWithGoogle}
      >
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
