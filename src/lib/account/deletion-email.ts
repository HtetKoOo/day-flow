export function deletionRequestReference(requestId: string) {
  return requestId.slice(0, 8).toUpperCase();
}

export function deletionEmailContent(code: string, requestId: string) {
  const reference = deletionRequestReference(requestId);
  return {
    subject: `DayFlow account deletion — ${reference}`,
    text: [
      "Your DayFlow account deletion code is:",
      "",
      code,
      "",
      `Request reference: ${reference}`,
      "Use this code only when the same reference is shown in your DayFlow deletion dialog.",
      "A new code replaces the previous one. Check this reference instead of reusing an older email.",
      "",
      "This code expires in 10 minutes and only authorizes deletion from the browser session that requested it.",
      "Enter it in DayFlow and confirm only if you want to permanently delete your account.",
      "",
      "If you did not request this, do not share the code. Your account has not been deleted.",
    ].join("\n"),
  };
}
