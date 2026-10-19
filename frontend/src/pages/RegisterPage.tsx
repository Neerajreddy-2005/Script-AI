import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type React from "react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/auth-context";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast.error("Please accept the terms and privacy policy");
      return;
    }
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const signedIn = await signUp(email, password, name);
      if (signedIn) {
        toast.success("Registration successful");
        navigate("/dashboard");
      } else {
        toast.success("Check your inbox to confirm your email, then log in.");
        navigate("/login");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start writing platform-ready scripts in seconds. It's free.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-text">
            Full name
          </label>
          <input id="name" type="text" autoComplete="name" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

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
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-text">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters</p>
        </div>

        <label htmlFor="terms" className="flex items-start gap-3 text-sm text-muted">
          <input
            id="terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line-input accent-[rgb(var(--accent))]"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            I agree to the{" "}
            <Link to="/terms-of-service" className="font-semibold text-accent-text hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="font-semibold text-accent-text hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <button type="submit" className="btn-primary w-full py-3" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent-text hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
