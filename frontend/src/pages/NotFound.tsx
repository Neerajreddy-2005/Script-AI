import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const NotFound = () => (
  <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
    <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
    <div className="text-center">
      <p className="bg-gradient-to-r from-accent to-[#d946ef] bg-clip-text text-8xl font-extrabold text-transparent sm:text-9xl">404</p>
      <h1 className="mt-4 text-3xl font-bold text-text">This page isn't in the script</h1>
      <p className="mt-3 text-lg text-muted">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-8">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
    </div>
  </section>
);

export default NotFound;
