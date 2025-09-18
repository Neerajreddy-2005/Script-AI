
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HowItWorksPage = () => {
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            entry.target.classList.remove("opacity-0");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    stepsRef.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const steps = [
    {
      number: "01",
      title: "Input Your Topic",
      description: "Start by entering your content topic and select your preferred platform, tone, and length.",
      image: "https://images.unsplash.com/photo-1551034549-befb91b260e0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "Choose from platforms like YouTube, TikTok, Instagram, Podcast, LinkedIn, or Twitter",
        "Select a tone that matches your brand voice (casual, professional, humorous, etc.)",
        "Define the length of your script based on your content needs"
      ]
    },
    {
      number: "02",
      title: "Customize Script Options",
      description: "Fine-tune your script by selecting additional options like thumbnail generation, voice output, or AI image suggestions.",
      image: "https://images.unsplash.com/photo-1587691592099-24045742c181?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "Enable premium features based on your subscription level",
        "Preview available add-ons like thumbnail generation or voice output",
        "Customize generation parameters for optimal results"
      ]
    },
    {
      number: "03",
      title: "Generate Your Script",
      description: "Click the 'Generate Script' button and our AI will create a professionally structured script in seconds.",
      image: "https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "AI analyzes your topic and generates relevant content",
        "Script is structured with introduction, main content, and conclusion",
        "Content is optimized for the platform you selected"
      ]
    },
    {
      number: "04",
      title: "Review and Edit",
      description: "Review your generated script in the editor view and make any necessary adjustments to fit your exact needs.",
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "Edit text directly in the editor view",
        "Toggle between editor and preview mode",
        "Regenerate portions if needed for refinement"
      ]
    },
    {
      number: "05",
      title: "Enhance Your Content",
      description: "Use premium features to enhance your script with voice output, thumbnails, or AI image suggestions.",
      image: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "Generate professional thumbnails with customizable text and design",
        "Convert your script to audio with natural-sounding voices",
        "Get AI-suggested images to complement your content"
      ]
    },
    {
      number: "06",
      title: "Download and Use",
      description: "Download your completed script, audio, or thumbnails and use them in your content creation workflow.",
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      details: [
        "Export script in various formats (TXT, PDF, DOCX)",
        "Download generated thumbnails in high resolution",
        "Save audio files for use in your videos or podcasts"
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-3 py-1 bg-scriptai-lightblue text-scriptai-blue rounded-full text-sm font-medium">
            THE PROCESS
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            How ScriptAI <span className="text-scriptai-blue">Works</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-scriptai-darkgray">
            From idea to polished script in minutes. Our AI-powered tool streamlines your content creation process.
          </p>
        </div>
        
        {/* Process Steps */}
        <div className="space-y-24 mb-20">
          {steps.map((step, index) => (
            <div 
              key={index}
              ref={(el) => (stepsRef.current[index] = el)}
              className={`opacity-0 transition-all duration-500 flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
            >
              <div className="flex-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-scriptai-blue text-white text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h2 className="text-3xl font-bold text-scriptai-black mb-4">{step.title}</h2>
                <p className="text-lg text-scriptai-darkgray mb-6">{step.description}</p>
                <ul className="space-y-3">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="h-5 w-5 text-scriptai-blue mr-2 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-scriptai-darkgray">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-scriptai-blue/20 rounded-xl transform translate-x-3 translate-y-3"></div>
                  <img
                    src={step.image}
                    alt={step.title}
                    className="relative rounded-xl shadow-md w-full h-64 md:h-96 object-cover"
                  />
                  {index === 2 && (
                    <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-scriptai-blue animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* AI Explanation Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-16">
          <h2 className="text-2xl font-bold text-scriptai-black mb-6 text-center">Our AI Technology</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-scriptai-lightblue text-scriptai-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">Natural Language Processing</h3>
              <p className="text-scriptai-darkgray">
                Our AI uses advanced NLP to understand context, intent, and nuance in your topic to generate relevant, engaging scripts.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-scriptai-lightblue text-scriptai-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">Content Structure Analysis</h3>
              <p className="text-scriptai-darkgray">
                Our system analyzes thousands of successful scripts to understand the optimal structure for each platform and content type.
              </p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-scriptai-lightblue text-scriptai-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">Continuous Learning</h3>
              <p className="text-scriptai-darkgray">
                Our AI improves with every script generated, learning from user feedback to deliver increasingly better results over time.
              </p>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-scriptai-black mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">How long does it take to generate a script?</h3>
              <p className="text-scriptai-darkgray">
                Most scripts are generated within seconds. For longer or more complex scripts, it may take up to 30 seconds depending on server load.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">Can I edit the generated scripts?</h3>
              <p className="text-scriptai-darkgray">
                Yes, all scripts can be edited directly in the editor view. You can modify any part of the script to better match your specific needs.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">Do you store my scripts?</h3>
              <p className="text-scriptai-darkgray">
                Yes, we store your generated scripts in your account history so you can access them later. All data is securely stored and you can delete scripts at any time.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-scriptai-black mb-2">What formats can I download my scripts in?</h3>
              <p className="text-scriptai-darkgray">
                Scripts can be downloaded as TXT, PDF, or DOCX files. Premium subscribers can also download audio versions of their scripts.
              </p>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="bg-scriptai-blue rounded-xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Content Creation?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Get started with ScriptAI today and see how our AI-powered tool can revolutionize your scriptwriting process.
          </p>
          <Link to="/register">
            <Button className="bg-white text-scriptai-blue hover:bg-gray-100 px-8 py-6 text-lg font-medium rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
              Start Creating Scripts Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
