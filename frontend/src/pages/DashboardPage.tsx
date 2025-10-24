import { useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SessionContext } from "../App";

interface GeneratedScript {
  title: string;
  introduction: any;
  mainContent: any;
  conclusion: any;
}


const DashboardPage = () => {
  const { user } = useContext(SessionContext);
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [tone, setTone] = useState("Casual");
  const [length, setLength] = useState("Short (2-3 min)");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [selectedTab, setSelectedTab] = useState("editor");
  const [subscription, setSubscription] = useState("pro"); // basic, pro, premium


  const generateScript = async () => {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      console.log('🚀 Sending request to backend:', `${backendUrl}/api/generate-script`);
      console.log('📝 Request payload:', { topic, platform, tone, length });
      
      const response = await fetch(`${backendUrl}/api/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          length
        })
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend response data:', result.data);
      
      if (result.success) {
        setGeneratedScript(result.data);
        toast.success(`🎉 Script generated successfully for ${platform}!`);
      } else {
        toast.error(result.error || "Failed to generate script");
      }
    } catch (error) {
      console.error('❌ Error generating script:', error);
      toast.error(`Failed to generate script: ${error.message}`);
      
      // Fallback to mock data if backend is not available
      console.log('🔄 Using fallback mock data...');
      const exampleScript: GeneratedScript = {
        title: `${topic} - Script for ${platform}`,
        introduction: `[${tone.toUpperCase()}] Hook your audience with a strong intro\n\nHello everyone! Today we're diving deep into ${topic}. This is something I'm really passionate about, and I can't wait to share my insights with you.`,
        mainContent: `[${tone.toUpperCase()}] Deliver your key points clearly and concisely\n\nLet's talk about the three most important aspects of ${topic}:\n\n1. The fundamentals that everyone should know\n2. Common misconceptions that might be holding you back\n3. Advanced strategies that can take your understanding to the next level`,
        conclusion: `[${tone.toUpperCase()}] End with a call-to-action\n\nThanks for staying with me through this exploration of ${topic}. If you found this valuable, make sure to like and subscribe for more content like this!`,
      };
      
      setGeneratedScript(exampleScript);
      toast.success("Script generated successfully! (Using fallback mode)");
    } finally {
      setIsGenerating(false);
    }
  };


  const platforms = ["YouTube", "TikTok", "Instagram", "Podcast", "LinkedIn", "Twitter"];
  
  const tones = ["Casual", "Professional", "Humorous", "Educational", "Persuasive", "Inspirational"];
  
  const lengths = [
    "Short (2-3 min)",
    "Medium (5-7 min)",
    "Long (10-15 min)",
    "Extra Long (20+ min)"
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 bg-scriptai-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-scriptai-black">Your Script Dashboard</h1>
          <p className="text-scriptai-darkgray mt-2">
            Create professional scripts for your content with our AI-powered tool.
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-8">
          <div className="text-sm text-scriptai-darkgray mb-2">Demo Mode: Select Subscription Level</div>
          <div className="flex space-x-2">
            <button 
              className={`px-4 py-1 rounded-md transition-colors ${subscription === 'basic' ? 'bg-scriptai-lightblue text-scriptai-blue' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
              onClick={() => setSubscription('basic')}
            >
              Basic
            </button>
            <button 
              className={`px-4 py-1 rounded-md transition-colors ${subscription === 'pro' ? 'bg-scriptai-lightblue text-scriptai-blue' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
              onClick={() => setSubscription('pro')}
            >
              Pro
            </button>
            <button 
              className={`px-4 py-1 rounded-md transition-colors ${subscription === 'premium' ? 'bg-scriptai-lightblue text-scriptai-blue' : 'bg-gray-100 text-scriptai-darkgray hover:bg-gray-200'}`}
              onClick={() => setSubscription('premium')}
            >
              Premium
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-scriptai-black mb-6">Create Your Script</h2>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-scriptai-black mb-6">Script Parameters</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                    What's your topic?
                  </label>
                  <input
                    id="topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Productivity tips for remote work"
                    className="input-field"
                  />
                </div>

                <div>
                  <label htmlFor="platform" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                    Platform
                  </label>
                  <div className="relative">
                    <select
                      id="platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="input-field appearance-none pr-10 cursor-pointer"
                    >
                      {platforms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="tone" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                    Tone
                  </label>
                  <div className="relative">
                    <select
                      id="tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="input-field appearance-none pr-10 cursor-pointer"
                    >
                      {tones.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="length" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                    Length
                  </label>
                  <div className="relative">
                    <select
                      id="length"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="input-field appearance-none pr-10 cursor-pointer"
                    >
                      {lengths.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className={`rounded-lg p-4 ${subscription === 'premium' ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={`mr-2 ${subscription === 'premium' ? 'text-yellow-500' : 'text-gray-400'}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className={`text-sm font-medium ${subscription === 'premium' ? 'text-yellow-700' : 'text-gray-500'}`}>Premium Features</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="voice-output"
                        type="checkbox"
                        className="w-4 h-4 text-scriptai-blue focus:ring-scriptai-blue/30 border-gray-300 rounded"
                        disabled={subscription !== 'premium'}
                      />
                      <label htmlFor="voice-output" className={`ml-2 text-sm ${subscription === 'premium' ? 'text-gray-700' : 'text-gray-400'}`}>
                        Voice Output
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="enhanced-content"
                        type="checkbox"
                        className="w-4 h-4 text-scriptai-blue focus:ring-scriptai-blue/30 border-gray-300 rounded"
                        defaultChecked
                        disabled={subscription !== 'premium'}
                      />
                      <label htmlFor="enhanced-content" className={`ml-2 text-sm ${subscription === 'premium' ? 'text-gray-700' : 'text-gray-400'}`}>
                        Enhanced AI Content
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="image-suggestions"
                        type="checkbox"
                        className="w-4 h-4 text-scriptai-blue focus:ring-scriptai-blue/30 border-gray-300 rounded"
                        disabled={subscription !== 'premium'}
                      />
                      <label htmlFor="image-suggestions" className={`ml-2 text-sm ${subscription === 'premium' ? 'text-gray-700' : 'text-gray-400'}`}>
                        AI Image Suggestions
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="generate-thumbnail"
                        type="checkbox"
                        className="w-4 h-4 text-scriptai-blue focus:ring-scriptai-blue/30 border-gray-300 rounded"
                        defaultChecked
                        disabled={subscription === 'basic'}
                      />
                      <label htmlFor="generate-thumbnail" className={`ml-2 text-sm ${subscription === 'basic' ? 'text-gray-400' : 'text-gray-700'}`}>
                        Generate Thumbnail
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-scriptai-darkgray">
                    {subscription === 'premium' 
                      ? 'Enhanced AI generates more detailed, SEO-optimized content. Generate a thumbnail for your content.'
                      : subscription === 'pro'
                      ? 'Upgrade to Premium to access Voice Output and AI Image Suggestions.'
                      : 'Upgrade to Pro or Premium to unlock these features.'}
                  </div>
                </div>

                <Button
                  className="w-full btn-primary"
                  onClick={generateScript}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.414l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                      </svg>
                      Generate Script
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            {generatedScript ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-scriptai-black">
                    {generatedScript.title}
                  </h2>
                  <div className="flex space-x-2">
                    <button 
                      className="flex items-center text-sm text-scriptai-darkgray hover:text-scriptai-black transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${generatedScript.introduction.script}\n\n${generatedScript.mainContent.script}\n\n${generatedScript.conclusion.script}`
                        );
                        toast.success("Script copied to clipboard");
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                      </svg>
                      Copy
                    </button>
                    <button 
                      className="flex items-center text-sm text-scriptai-darkgray hover:text-scriptai-black transition-colors"
                      onClick={() => setGeneratedScript(null)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex space-x-1 border-b border-gray-200">
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selectedTab === "editor"
                          ? "border-b-2 border-scriptai-blue text-scriptai-blue"
                          : "text-scriptai-darkgray hover:text-scriptai-black"
                      }`}
                      onClick={() => setSelectedTab("editor")}
                    >
                      Editor
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selectedTab === "preview"
                          ? "border-b-2 border-scriptai-blue text-scriptai-blue"
                          : "text-scriptai-darkgray hover:text-scriptai-black"
                      }`}
                      onClick={() => setSelectedTab("preview")}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {selectedTab === "editor" ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-scriptai-blue mb-2">Introduction</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {generatedScript.introduction.script}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-scriptai-blue mb-2">Main Content</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {generatedScript.mainContent.script}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-scriptai-blue mb-2">Conclusion</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {generatedScript.conclusion.script}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Script Preview</h3>
                    <div className="prose max-w-none">
                      <p>{generatedScript.introduction.script.replace(/\[.*?\]/g, '')}</p>
                      <p>{generatedScript.mainContent.script.replace(/\[.*?\]/g, '')}</p>
                      <p>{generatedScript.conclusion.script.replace(/\[.*?\]/g, '')}</p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center" style={{ minHeight: "400px" }}>
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-scriptai-darkgray">Your script will appear here after generation.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
