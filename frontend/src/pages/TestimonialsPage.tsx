
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TestimonialsPage = () => {
  const testimonialRefs = useRef<(HTMLDivElement | null)[]>([]);
  
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

    testimonialRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Content Creator, 500K+ Subscribers",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "ScriptAI has revolutionized my content creation process. I've cut my scripting time by 75%, and the quality is consistently professional. The platform's ability to maintain my unique voice while suggesting improvements has been incredible.",
      rating: 5,
      platform: "YouTube"
    },
    {
      name: "Michael Chen",
      role: "Educational YouTuber",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "As an educator, I need scripts that are clear, informative, and engaging. ScriptAI has been a game-changer for my channel, helping me create content that resonates with my audience. The educational tone option is perfect for my needs.",
      rating: 5,
      platform: "YouTube"
    },
    {
      name: "Aisha Patel",
      role: "Podcast Host, 'Tech Talk Today'",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "As someone who struggled with script structure, ScriptAI has been invaluable. The advanced features, especially the voice output, save me so much time in my podcast production workflow. My listener engagement has increased significantly since using the platform.",
      rating: 5,
      platform: "Podcast"
    },
    {
      name: "David Rodriguez",
      role: "TikTok Creator, 1M+ Followers",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "The script templates for TikTok have helped me create viral content consistently. ScriptAI understands the platform's specific needs and has become an essential part of my content strategy. My engagement metrics have improved significantly.",
      rating: 4,
      platform: "TikTok"
    },
    {
      name: "Emma Wilson",
      role: "Instagram Influencer",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "The AI image suggestions feature is a game-changer for my Instagram content. It helps me create cohesive stories and captions that resonate with my audience. The thumbnail generation feature has also increased my Reels views substantially.",
      rating: 5,
      platform: "Instagram"
    },
    {
      name: "James Harrison",
      role: "Corporate Trainer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "I use ScriptAI to create scripts for corporate training videos. The professional tone setting and the ability to generate longer scripts have saved my team countless hours. The ROI has been phenomenal.",
      rating: 5,
      platform: "Corporate Videos"
    },
    {
      name: "Sophia Garcia",
      role: "LinkedIn Content Creator",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "The platform's ability to generate professional content for LinkedIn has been instrumental in growing my personal brand. The scripts are informative, persuasive, and perfect for business professionals. Highly recommended for B2B content creators.",
      rating: 4,
      platform: "LinkedIn"
    },
    {
      name: "Tom Jackson",
      role: "Video Marketing Specialist",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "I've tried several AI scriptwriting tools, and ScriptAI is by far the most intuitive and effective. The 24/7 chatbot support has been extremely helpful whenever I've had questions or issues.",
      rating: 5,
      platform: "Marketing Videos"
    },
    {
      name: "Olivia Kim",
      role: "Social Media Manager",
      image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      quote: "Managing social media accounts for multiple clients was overwhelming until I found ScriptAI. Now I can quickly generate platform-specific scripts that match each brand's voice. It's saved me hours of work every week.",
      rating: 5,
      platform: "Social Media"
    }
  ];

  const showcaseTestimonials = [
    {
      name: "Emma Wilson",
      role: "Instagram Influencer",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      company: "LifestyleWithEmma",
      quote: "The AI image suggestions feature is a game-changer for my Instagram content. It helps me create cohesive stories and captions that resonate with my audience.",
      metrics: "40% increase in engagement",
      bgColor: "bg-blue-50"
    },
    {
      name: "David Rodriguez",
      role: "TikTok Creator",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      company: "@davidcreates",
      quote: "The script templates for TikTok have helped me create viral content consistently. ScriptAI understands the platform's specific needs.",
      metrics: "1M+ followers in 6 months",
      bgColor: "bg-purple-50"
    },
    {
      name: "James Harrison",
      role: "Corporate Trainer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      company: "TechLearn Inc.",
      quote: "I use ScriptAI to create scripts for corporate training videos. The professional tone setting and longer scripts have saved my team countless hours.",
      metrics: "Training production time cut by 60%",
      bgColor: "bg-green-50"
    }
  ];

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-3 py-1 bg-scriptai-lightblue text-scriptai-blue rounded-full text-sm font-medium">
            SUCCESS STORIES
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            What Our <span className="text-scriptai-blue">Users Say</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-scriptai-darkgray">
            Hear from content creators who have transformed their workflow with ScriptAI.
          </p>
        </div>
        
        {/* Featured Success Stories */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-scriptai-black mb-8 text-center">Featured Success Stories</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {showcaseTestimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${testimonial.bgColor}`}
              >
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="h-16 w-16 rounded-full border-2 border-white shadow-sm"
                    />
                    <div className="ml-4">
                      <h3 className="font-bold text-scriptai-black">{testimonial.name}</h3>
                      <p className="text-scriptai-darkgray text-sm">{testimonial.role}</p>
                      <p className="text-scriptai-blue text-sm">{testimonial.company}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-scriptai-darkgray italic">"{testimonial.quote}"</p>
                    
                    <div className="flex items-center justify-end">
                      <div className="text-sm font-medium text-green-600">
                        {testimonial.metrics}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* All Testimonials */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-scriptai-black mb-8 text-center">More Testimonials from Our Users</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                ref={(el) => (testimonialRefs.current[index] = el)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 opacity-0 transition-all duration-500"
              >
                <div className="flex items-start mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-semibold text-scriptai-black">{testimonial.name}</h3>
                    <p className="text-scriptai-darkgray text-sm">{testimonial.role}</p>
                    
                    <div className="flex items-center mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${
                            i < testimonial.rating ? "text-yellow-400" : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-xs text-scriptai-darkgray">
                        {testimonial.platform}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-scriptai-darkgray italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Platform Usage Statistics */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-16">
          <h2 className="text-2xl font-bold text-scriptai-black mb-8 text-center">ScriptAI by the Numbers</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-scriptai-blue mb-2">500K+</div>
              <p className="text-scriptai-darkgray">Scripts Generated</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-scriptai-blue mb-2">50K+</div>
              <p className="text-scriptai-darkgray">Active Users</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-scriptai-blue mb-2">97%</div>
              <p className="text-scriptai-darkgray">Satisfaction Rate</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-scriptai-blue mb-2">15+</div>
              <p className="text-scriptai-darkgray">Supported Platforms</p>
            </div>
          </div>
          
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-scriptai-black mb-6 text-center">Most Popular Content Platforms</h3>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-scriptai-darkgray">YouTube</span>
                  <span className="text-sm font-medium text-scriptai-darkgray">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-scriptai-blue h-2 rounded-full" style={{ width: "45%" }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-scriptai-darkgray">TikTok</span>
                  <span className="text-sm font-medium text-scriptai-darkgray">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-scriptai-blue h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-scriptai-darkgray">Instagram</span>
                  <span className="text-sm font-medium text-scriptai-darkgray">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-scriptai-blue h-2 rounded-full" style={{ width: "15%" }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-scriptai-darkgray">Podcast</span>
                  <span className="text-sm font-medium text-scriptai-darkgray">10%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-scriptai-blue h-2 rounded-full" style={{ width: "10%" }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-scriptai-darkgray">Other</span>
                  <span className="text-sm font-medium text-scriptai-darkgray">5%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-scriptai-blue h-2 rounded-full" style={{ width: "5%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-scriptai-black mb-6">Join Our Satisfied Users Today</h2>
          <p className="text-xl text-scriptai-darkgray mb-8 max-w-2xl mx-auto">
            Start creating professional scripts with ScriptAI and experience the benefits that thousands of content creators are already enjoying.
          </p>
          
          <div className="flex justify-center">
            <Link to="/register">
              <Button className="btn-primary text-base py-6 px-8 w-full sm:w-auto">
                Start Your Free Trial
              </Button>
            </Link>
          </div>
          
          <p className="mt-4 text-sm text-scriptai-darkgray">
            No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsPage;
