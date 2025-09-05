import { useEffect } from "react";
import { Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Auth = () => {
  const { isAuthenticated, exchangeGoogleToken, isAuthenticating } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const clientId =
      (import.meta as ImportMeta).env?.VITE_GOOGLE_CLIENT_ID || "";
    const container = document.getElementById("g_id_signin");
    if (!clientId || !container) return;
    if (!window.google || !window.google.accounts) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: unknown) => {
        const cred = (response as { credential?: string } | null)?.credential;
        if (cred) {
          const ok = await exchangeGoogleToken(cred);
          if (ok) {
            window.location.href = "/";
          }
        }
      },
    });
    window.google.accounts.id.renderButton(container, {
      theme: "filled_blue",
      size: "large",
      width: 320,
      type: "standard",
      text: "continue_with",
      shape: "pill",
    });
  }, [exchangeGoogleToken]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30"></div>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-4">
        {/* Main Auth Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl shadow-blue-500/10 p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Resume Analyzer
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed">
              Sign in to start analyzing resumes with AI-powered insights
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                Instant Analysis
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                Secure & Private
              </span>
            </div>
          </div>

          {/* Google Sign In Button (official GIS button) */}
          <div className="flex justify-center mb-2">
            <div id="g_id_signin"></div>
          </div>

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center mt-8 leading-relaxed">
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
      {isAuthenticating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl">
            <div className="w-10 h-10 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-700 font-medium">Signing you in...</p>
          </div>
        </div>
      )}
    </div>
  );
};
