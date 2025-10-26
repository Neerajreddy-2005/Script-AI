import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Check if user is on dashboard page
  const isDashboard = location.pathname.includes('/dashboard');
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    
    // Scroll to top on page change
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location]);
  
  // Consistent glassy effect for all pages
  const navbarClasses = isScrolled 
    ? 'bg-white/70 backdrop-blur-lg shadow-sm' 
    : 'bg-white/30 backdrop-blur-md';

  if (isDashboard) {
    return (
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${navbarClasses}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-scriptai-black">Script<span className="text-scriptai-blue">AI</span></span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:block font-medium">Dashboard</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${navbarClasses}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center group">
            <span className="text-xl font-bold text-scriptai-black transition-all duration-300 group-hover:text-scriptai-blue">Script<span className="text-scriptai-blue">AI</span></span>
          </Link>
          
          {/* Desktop Navigation - Features Only */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/features" className={`font-medium transition-all duration-300 hover:scale-105 ${location.pathname === '/features' ? 'text-scriptai-blue' : 'text-scriptai-darkgray hover:text-scriptai-black'}`}>
              Features
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/dashboard">
              <Button className="bg-scriptai-blue hover:bg-blue-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-200">
                Get Started
              </Button>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-scriptai-darkgray p-2"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu - Features Only */}
      <div className={`md:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-96' : 'max-h-0 overflow-hidden'}`}>
        <div className="px-4 pt-2 pb-4 space-y-4 bg-white/90 backdrop-blur-md shadow-sm">
          <Link to="/features" className="block font-medium text-scriptai-darkgray hover:text-scriptai-black py-2">
            Features
          </Link>
          <div className="pt-2">
            <Link to="/dashboard" className="btn-primary inline-block text-center w-full">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
