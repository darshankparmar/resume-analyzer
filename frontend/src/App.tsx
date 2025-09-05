import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Individual from "./pages/Individual";
import OptimizedResumePage from "./pages/OptimizedResume";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";
import HRBatchPage from "./pages/HRBatchPage";
import { Auth } from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/individual"
                  element={
                    <ProtectedRoute>
                      <Individual />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/optimized"
                  element={
                    <ProtectedRoute>
                      <OptimizedResumePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/hr"
                  element={
                    <ProtectedRoute>
                      <HRBatchPage />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
