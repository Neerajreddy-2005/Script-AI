
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const BlogPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<(HTMLDivElement | null)[]>([]);
  
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

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    articleRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const blogPosts = [
    {
      title: "How AI is Revolutionizing Content Creation",
      excerpt: "Discover how artificial intelligence is transforming the way creators develop scripts and content across multiple platforms.",
      date: "May 15, 2023",
      imageUrl: "https://images.unsplash.com/photo-1677442135406-67d4205c113b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2232&q=80",
      category: "AI Technology"
    },
    {
      title: "5 Tips for Writing Engaging YouTube Scripts",
      excerpt: "Learn the secrets of creating compelling YouTube scripts that keep viewers watching until the end.",
      date: "April 22, 2023",
      imageUrl: "https://images.unsplash.com/photo-1629411949417-762a1aa082a4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
      category: "Script Writing"
    },
    {
      title: "The Future of Voice Synthesis in Content Creation",
      excerpt: "Explore how advanced voice synthesis is changing the way content creators produce audio for their projects.",
      date: "March 10, 2023",
      imageUrl: "https://images.unsplash.com/photo-1590578226128-8297d032539e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80",
      category: "Voice Technology"
    },
    {
      title: "Optimizing Scripts for Different Social Media Platforms",
      excerpt: "A comprehensive guide to tailoring your scripts for maximum engagement across various social media channels.",
      date: "February 3, 2023",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
      category: "Social Media"
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header Section */}
      <section 
        ref={headerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 opacity-0"
      >
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            ScriptAI <span className="text-scriptai-blue">Blog</span>
          </h1>
          <p className="text-xl text-scriptai-darkgray max-w-3xl mx-auto">
            Expert insights, tips, and updates to help you create better content
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {blogPosts.map((post, index) => (
            <div
              key={index}
              ref={(el) => (articleRefs.current[index] = el)}
              className="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md opacity-0"
            >
              <div className="h-60 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-scriptai-blue">{post.category}</span>
                  <span className="text-sm text-scriptai-darkgray">{post.date}</span>
                </div>
                <h3 className="text-xl font-semibold text-scriptai-black mb-2">{post.title}</h3>
                <p className="text-scriptai-darkgray mb-4">{post.excerpt}</p>
                <a href="#" className="text-scriptai-blue font-medium hover:underline inline-flex items-center">
                  Read More
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-scriptai-lightblue py-16 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-scriptai-black mb-4">
            Stay Updated with Our Newsletter
          </h2>
          <p className="text-lg text-scriptai-darkgray mb-8 max-w-3xl mx-auto">
            Get the latest content creation tips, AI updates, and exclusive resources directly to your inbox.
          </p>
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="input-field flex-grow"
            />
            <Button className="bg-scriptai-blue hover:bg-blue-600 text-white sm:w-auto">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
