/** Map Firebase auth error codes to friendly, human-readable messages. */
export function friendlyFirebaseError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a moment.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in your Firebase project.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in your Firebase project.";
    case "auth/account-exists-with-different-credential":
      return "An account exists with the same email using a different sign-in method.";
    default:
      return err instanceof Error
        ? err.message.replace(/^Firebase: /, "")
        : "Something went wrong. Please try again.";
  }
}
