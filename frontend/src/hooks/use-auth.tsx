import React, { createContext, useContext, useEffect, useState } from "react";

type AuthUser = Record<string, unknown> | null;

type AuthContextType = {
  user: AuthUser;
  isAuthenticated: boolean;
  signOut: () => void;
  exchangeGoogleToken: (credential: string) => Promise<boolean>;
  isAuthenticating: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser>(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const API_BASE = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || "";
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      // Optional: revoke auto-select session for GIS
      window.google?.accounts.id.disableAutoSelect?.();
    } catch {
      // ignore
    }
  };

  const exchangeGoogleToken = async (credential: string): Promise<boolean> => {
    setIsAuthenticating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        signOut,
        exchangeGoogleToken,
        isAuthenticating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
