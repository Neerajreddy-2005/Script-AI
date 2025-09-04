import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const HomePage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            entry.target.classList.remove('opacity-0');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    featureRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const features = [
    {
      title: "AI-Powered Script Generation",
      description: "Create professional scripts for videos, podcasts, and social media in seconds with advanced AI technology.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      title: "Multiple Platform Support",
      description: "Optimize your scripts for various platforms including YouTube, TikTok, Instagram, and podcasts.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Voice Output",
      description: "Convert your scripts to audio with natural-sounding voice synthesis for immediate use in your content.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      title: "Thumbnail Generation",
      description: "Create eye-catching thumbnails with AI-powered image generation to complement your scripts.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef} 
        className="pt-28 pb-16 sm:pt-32 sm:pb-20 opacity-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block mb-4 px-3 py-1 bg-scriptai-lightblue text-scriptai-blue rounded-full text-sm font-medium">
              AI-POWERED SCRIPTWRITING
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-scriptai-black mb-6">
              Transform Ideas <br />
              Into <span className="text-scriptai-blue">Compelling Scripts</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-scriptai-darkgray mb-10">
              Create professional scripts for videos, podcasts, and social media in seconds with our intuitive AI scriptwriter.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register">
                <Button className="btn-primary text-base py-6 px-8 w-full sm:w-auto">
                  Start Creating
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button className="btn-secondary text-base py-6 px-8 w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Sample Script Preview */}
          <div className="mt-16 max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="p-8 bg-white w-full md:w-1/2">
                <h3 className="text-xl font-semibold text-scriptai-black mb-2">Sample Script</h3>
                <h4 className="text-lg text-scriptai-blue mb-4">Introduction</h4>
                <p className="text-scriptai-darkgray mb-4">
                  Hey everyone! Welcome back to my channel. Today we're diving into a topic many of you have requested...
                </p>
                <h4 className="text-lg text-scriptai-blue mb-4">Main Points</h4>
                <ul className="list-disc list-inside space-y-2 text-scriptai-darkgray mb-4">
                  <li>First, we'll explore the basics</li>
                  <li>Then, I'll share my personal experience</li>
                  <li>Finally, actionable tips you can implement today</li>
                </ul>
                <h4 className="text-lg text-scriptai-blue mb-4">Call to Action</h4>
                <p className="text-scriptai-darkgray">
                  If you found this valuable, don't forget to like and subscribe for more content like this!
                </p>
              </div>
              <div className="bg-scriptai-lightblue p-8 w-full md:w-1/2">
                <div className="flex items-center mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-scriptai-darkgray mr-2">1</span>
                    <div className="flex-1 bg-white bg-opacity-50 p-2 rounded">
                      <span className="text-scriptai-black">Hey everyone! Welcome back to my channel.</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-scriptai-darkgray mr-2">2</span>
                    <div className="flex-1 bg-white bg-opacity-50 p-2 rounded">
                      <span className="text-scriptai-black">Today we're diving into a topic many of you have requested...</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-scriptai-darkgray mr-2">3</span>
                    <div className="flex-1 bg-white bg-opacity-50 p-2 rounded">
                      <span className="text-scriptai-black">First, we'll explore the basics of this subject.</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-scriptai-darkgray mr-2">4</span>
                    <div className="flex-1 bg-white bg-opacity-50 p-2 rounded">
                      <span className="text-scriptai-black">Then, I'll share my personal experience with it.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-scriptai-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-scriptai-black">
              Powerful Features to Streamline Your Content Creation
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-scriptai-darkgray">
              Tools designed to help you create engaging scripts with minimal effort
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                ref={(el) => (featureRefs.current[index] = el)}
                className="bg-white rounded-xl shadow-sm p-8 opacity-0 transition-all duration-500 hover:shadow-md hover:scale-105"
              >
                <div className="mb-5">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-scriptai-black mb-3">{feature.title}</h3>
                <p className="text-scriptai-darkgray">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
