/** Tab-local ownership: another tab/device must still detect account deletion. */
export function createAuthExitCoordinator() {
  const active = new Set<symbol>();
  return {
    isActive: () => active.size > 0,
    begin() {
      const token = Symbol("intentional-auth-exit");
      active.add(token);
      return () => {
        active.delete(token);
      };
    },
  };
}
export const authExit = createAuthExitCoordinator();
