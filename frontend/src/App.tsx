import { Suspense, lazy, useEffect } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import CustomCursor from "./components/CustomCursor";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SupportChat from "./components/SupportChat";

import HomePage from "./pages/HomePage";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthProvider";

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

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Sonner />
        <BrowserRouter>
          <div className="relative min-h-screen flex flex-col">
            <CustomCursor />
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow">
              <Suspense fallback={<div className="min-h-screen" />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/help-center" element={<HelpCenterPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </main>
            <Footer />
            <SupportChat />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
