import React, { createContext, useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";

import CustomCursor from "./components/CustomCursor";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SupportChat from "./components/SupportChat";

import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";

import FeaturesPage from "./pages/FeaturesPage";
import BlogPage from "./pages/BlogPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFound from "./pages/NotFound";
import HowItWorksPage from "./pages/HowItWorksPage";

// Create session context
interface SessionContextType {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  user: any | null;
  setUser: (user: any | null) => void;
}

export const SessionContext = createContext<SessionContextType>({
  isAuthenticated: false,
  setAuthenticated: () => {},
  user: null,
  setUser: () => {},
});

// ScrollToTop component to ensure scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = React.useContext(SessionContext);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Create a client
const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  return (
    <SessionContext.Provider value={{ isAuthenticated, setAuthenticated, user, setUser }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="relative min-h-screen flex flex-col">
              <CustomCursor />
              <ScrollToTop />
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/help-center" element={<HelpCenterPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <SupportChat />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionContext.Provider>
  );
};

export default App;
