/**
 * SESSION STORE
 * 
 * A plain in-memory Map that tracks every active login.
 * Key   → the JWT token string (unique per login)
 * Value → a SessionEntry object describing who is logged in
 * 
 * Why a Map and not a plain object {}?
 * Map provides O(1) get/set/delete, has no prototype pollution risk,
 * and its .delete() method returns a boolean confirming the key existed.
 */
export interface sessionEntry {
    userId: number,
    role: string,
    email: string
}

const sessionStore = new Map<string, sessionEntry>();

export const SessionStore = {
    /**
   * Registers a new active session after successful login.
   */
    set(token: string, entry: sessionEntry): void {
        sessionStore.set(token, entry);
    },

    /**
   * Retrieves session data for an incoming request's token.
   * Returns undefined if the token is not in the store (logged out or locked).
   */
    get(token: string): sessionEntry | undefined {
        return sessionStore.get(token);
    },

    /**
   * Removes a session — called on logout or when an admin locks an account.
   * After this call, the JWT is still cryptographically valid but the server
   * will reject it because it no longer exists in the store.
   */
    deleteToken(token: string): boolean {
        return sessionStore.delete(token);
    },

    /**
   * Removes ALL sessions belonging to a specific user.
   * Used when an admin locks an account — invalidates every active
   * session for that user across all devices simultaneously.
   */
    deleteAllForUser(userId: number): void {
        for (const [token, entry] of sessionStore.entries()) {
            if (entry.userId === userId) {
                sessionStore.delete(token);
            }
        }
    },

    /**
   * Returns the current number of active sessions.
   * Useful for debugging and health check endpoints.
   */
    size(): number {
        return sessionStore.size;
    }
}

