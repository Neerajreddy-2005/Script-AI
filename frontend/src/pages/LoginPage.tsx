import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type React from "react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success("Login successful");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.info("Enter your email address first, then click 'Forgot password?'");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("If an account exists for that email, a reset link is on its way.");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep writing.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-text">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-text">
              Password
            </label>
            <button type="button" onClick={handleForgotPassword} className="text-sm font-semibold text-accent-text hover:underline">
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-accent-text hover:underline">
          Sign up for free
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
