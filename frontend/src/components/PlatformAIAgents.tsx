import React from 'react';
import { Button } from '@/components/ui/button';

interface PlatformAIAgentsProps {
  selectedPlatform: string;
  onPlatformSelect: (platform: string) => void;
  onGenerateWithAgent: (platform: string) => void;
  isGenerating: boolean;
}

const PlatformAIAgents: React.FC<PlatformAIAgentsProps> = ({
  selectedPlatform,
  onPlatformSelect,
  onGenerateWithAgent,
  isGenerating
}) => {
  const platforms = [
    {
      id: 'YouTube',
      name: 'YouTube',
      icon: '📺',
      description: 'Video content with hooks, timestamps, and engagement',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    },
    {
      id: 'TikTok',
      name: 'TikTok',
      icon: '🎵',
      description: 'Short-form viral content with trending elements',
      color: 'bg-black',
      hoverColor: 'hover:bg-gray-800'
    },
    {
      id: 'Instagram',
      name: 'Instagram',
      icon: '📸',
      description: 'Visual storytelling with Stories, Reels, and Posts',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      hoverColor: 'hover:from-purple-600 hover:to-pink-600'
    },
    {
      id: 'LinkedIn',
      name: 'LinkedIn',
      icon: '💼',
      description: 'Professional content for business networking',
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700'
    },
    {
      id: 'Twitter',
      name: 'Twitter',
      icon: '🐦',
      description: 'Concise threads and viral tweets',
      color: 'bg-blue-400',
      hoverColor: 'hover:bg-blue-500'
    },
    {
      id: 'Podcast',
      name: 'Podcast',
      icon: '🎙️',
      description: 'Audio content with conversational flow',
      color: 'bg-green-600',
      hoverColor: 'hover:bg-green-700'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-scriptai-black mb-2">
          Choose Your AI Content Agent
        </h3>
        <p className="text-sm text-scriptai-darkgray">
          Each platform has a specialized AI agent with platform-specific expertise
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
              selectedPlatform === platform.id
                ? 'border-scriptai-blue bg-scriptai-lightblue'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onPlatformSelect(platform.id)}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-white text-xl`}>
                {platform.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-scriptai-black">{platform.name}</h4>
                <p className="text-sm text-scriptai-darkgray mt-1">
                  {platform.description}
                </p>
              </div>
            </div>
            
            {selectedPlatform === platform.id && (
              <div className="mt-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateWithAgent(platform.id);
                  }}
                  disabled={isGenerating}
                  className={`w-full ${platform.color} ${platform.hoverColor} text-white`}
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.414l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                      </svg>
                      Generate with {platform.name} AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-800">AI Agent Specialization</h4>
            <p className="text-sm text-blue-700 mt-1">
              Each AI agent is trained specifically for its platform's unique requirements, 
              including optimal content length, engagement strategies, and platform-specific features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAIAgents;
