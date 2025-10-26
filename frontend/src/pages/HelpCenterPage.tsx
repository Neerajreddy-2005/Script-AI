
import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";

const HelpCenterPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  
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

    return () => {
      observer.disconnect();
    };
  }, []);

  const faqCategories = {
    'getting-started': [
      {
        id: 'gs1',
        question: 'How do I create my first script?',
        answer: 'To create your first script, navigate to the Dashboard. Enter your topic, select your platform and tone preferences, then click "Generate Script". Our AI will create a professional script based on your inputs.'
      },
      {
        id: 'gs2',
        question: 'What platforms does ScriptAI support?',
        answer: 'ScriptAI supports script creation for various platforms including YouTube, TikTok, Instagram, podcasts, and more. You can select your target platform when creating a new script, and our AI will optimize the content accordingly.'
      },
      {
        id: 'gs3',
        question: 'How do I edit a generated script?',
        answer: 'After a script is generated, you can edit it directly in our editor. Simply click on any section of the script to make changes. You can also use our AI tools to regenerate specific sections if needed.'
      }
    ],
    'technical': [
      {
        id: 'tech1',
        question: 'What browsers are supported?',
        answer: 'ScriptAI works best on modern browsers like Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated to the latest version for optimal performance.'
      },
      {
        id: 'tech2',
        question: 'Is there a mobile app available?',
        answer: 'Currently, ScriptAI is available as a web application optimized for both desktop and mobile browsers. A dedicated mobile app is in development and will be released soon.'
      },
      {
        id: 'tech3',
        question: 'How do I export my scripts?',
        answer: 'You can export your scripts in various formats including TXT, DOCX, and PDF. Simply open your script and click the "Export" button in the top right corner to select your preferred format.'
      }
    ],
    'features': [
      {
        id: 'feat1',
        question: 'How does the voice output feature work?',
        answer: 'The voice output feature converts your script to audio using advanced text-to-speech technology. To use this feature, open your script and click the "Generate Voice" button. You can choose from various voices and adjust settings like speed and tone.'
      },
      {
        id: 'feat2',
        question: 'Can I generate thumbnails for my content?',
        answer: 'Yes, Premium subscribers can generate thumbnails using our AI image generation tool. Navigate to the "Thumbnails" tab in your script editor and follow the prompts to create custom thumbnails for your content.'
      },
      {
        id: 'feat3',
        question: 'What languages are supported?',
        answer: 'Currently, ScriptAI supports English, Spanish, French, German, and Japanese. We are continuously working to add support for more languages based on user demand.'
      }
    ]
  };

  type CategoryKey = keyof typeof faqCategories;

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header Section */}
      <section 
        ref={headerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 opacity-0"
      >
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-scriptai-black mb-6">
            How Can We <span className="text-scriptai-blue">Help?</span>
          </h1>
          <p className="text-xl text-scriptai-darkgray max-w-3xl mx-auto mb-8">
            Find answers to common questions or contact our support team
          </p>
          <div className="max-w-2xl mx-auto flex rounded-lg overflow-hidden shadow-sm">
            <input 
              type="text" 
              placeholder="Search for answers..." 
              className="flex-grow px-4 py-3 focus:outline-none"
            />
            <Button className="bg-scriptai-blue hover:bg-blue-600 text-white rounded-none px-6">
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button 
            onClick={() => setActiveCategory('getting-started')}
            className={`px-5 py-2 rounded-full font-medium transition-all ${activeCategory === 'getting-started' ? 'bg-scriptai-blue text-white' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
          >
            Getting Started
          </button>
          <button 
            onClick={() => setActiveCategory('technical')}
            className={`px-5 py-2 rounded-full font-medium transition-all ${activeCategory === 'technical' ? 'bg-scriptai-blue text-white' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
          >
            Technical
          </button>
          <button 
            onClick={() => setActiveCategory('features')}
            className={`px-5 py-2 rounded-full font-medium transition-all ${activeCategory === 'features' ? 'bg-scriptai-blue text-white' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
          >
            Features
          </button>
        </div>
        
        <div className="space-y-4">
          {faqCategories[activeCategory as CategoryKey].map((faq) => (
            <div 
              key={faq.id}
              className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleQuestion(faq.id)}
                className="w-full text-left px-6 py-4 flex justify-between items-center bg-white hover:bg-gray-50"
              >
                <span className="font-medium text-scriptai-black">{faq.question}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-scriptai-blue transition-transform ${expandedQuestion === faq.id ? 'transform rotate-180' : ''}`}
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {expandedQuestion === faq.id && (
                <div className="px-6 py-4 bg-gray-50 animate-fade-in">
                  <p className="text-scriptai-darkgray">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section className="bg-scriptai-lightblue py-16 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-scriptai-black mb-4">
            Still Have Questions?
          </h2>
          <p className="text-lg text-scriptai-darkgray mb-8 max-w-3xl mx-auto">
            Our support team is here to help. Reach out to us and we'll get back to you as soon as possible.
          </p>
          <Button className="bg-scriptai-blue hover:bg-blue-600 text-white px-8 py-3 text-lg font-medium">
            Contact Support
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HelpCenterPage;
