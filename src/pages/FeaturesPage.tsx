
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FeaturesPage = () => {
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
      description: "Our advanced AI technology analyzes your topic and creates professional scripts tailored to your specific content needs.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      details: [
        "Contextually aware content generation",
        "Adapts to your specific topic and audience",
        "Continuously improving algorithms",
        "Structured format with introduction, main points, and conclusion"
      ]
    },
    {
      title: "Multi-Platform Optimization",
      description: "Create scripts optimized for various platforms including YouTube, TikTok, Instagram, podcasts, and more.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      details: [
        "Platform-specific structure and formatting",
        "Optimal script length for each platform",
        "Engagement strategies tailored to platform algorithms",
        "Tone adjustment for different audience expectations"
      ]
    },
    {
      title: "Customizable Tone and Style",
      description: "Select from various tones including casual, professional, humorous, educational, persuasive, and inspirational.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      details: [
        "Multiple tone options to match your brand voice",
        "Style customization for different content types",
        "Vocabulary adjustment based on selected tone",
        "Consistent voice throughout your content"
      ]
    },
    {
      title: "Premium Voice Output",
      description: "Convert your scripts to natural-sounding audio with our text-to-speech technology.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      details: [
        "High-quality voice synthesis",
        "Multiple voice options and accents",
        "Adjustable speaking rate and pitch",
        "Download audio for use in your content"
      ]
    },
    {
      title: "Thumbnail Generation",
      description: "Create eye-catching thumbnails with AI-powered image generation to complement your scripts.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      details: [
        "AI-generated images based on your script content",
        "Customizable text overlays and styling",
        "Optimal dimensions for each platform",
        "High-resolution downloads"
      ]
    },
    {
      title: "AI Image Suggestions",
      description: "Get AI-powered image suggestions to enhance your content visually.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      details: [
        "Content-relevant image recommendations",
        "Visual storytelling enhancement",
        "Emotion-evoking imagery selection",
        "Diverse style options"
      ]
    },
    {
      title: "Dynamic Support Chatbot",
      description: "Get assistance with tiered availability based on your subscription level.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      details: [
        "Basic: 6-hour support on weekdays",
        "Pro: 12-hour support daily",
        "Premium: 24/7 support",
        "Intelligent query resolution and direct admin escalation"
      ]
    },
    {
      title: "Script History & Versioning",
      description: "Access your previously generated scripts and iterate on them to improve your content.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      details: [
        "Complete script history storage",
        "Version comparison for iterative improvement",
        "Organization by platform and topic",
        "One-click regeneration with modified parameters"
      ]
    },
  ];

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-3 py-1 bg-scriptai-lightblue text-scriptai-blue rounded-full text-sm font-medium">
            POWERFUL FEATURES
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            Tools That Transform Your <br />
            <span className="text-scriptai-blue">Content Creation Process</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-scriptai-darkgray">
            Explore the powerful features that make ScriptAI the ultimate scriptwriting tool for content creators.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => (featureRefs.current[index] = el)}
              className="opacity-0 transition-all duration-500"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  {feature.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-scriptai-black mb-3">{feature.title}</h2>
                  <p className="text-scriptai-darkgray mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-scriptai-darkgray">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        

        
        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-scriptai-black mb-6">Ready to experience these features?</h2>
          <p className="text-xl text-scriptai-darkgray mb-8 max-w-2xl mx-auto">
            Start creating professional scripts today with our powerful AI-powered scriptwriting tool.
          </p>
          
          <div className="flex justify-center">
            <Link to="/register">
              <Button className="btn-primary text-base py-6 px-8 w-full sm:w-auto">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
