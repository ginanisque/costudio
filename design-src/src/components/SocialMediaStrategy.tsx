import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

const SocialMediaStrategy = () => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [contentType, setContentType] = useState('lookbook');
  const [generatedCaptions, setGeneratedCaptions] = useState<string[]>([]);

  const platforms = [
    { name: 'Instagram', id: 'instagram', color: 'bg-pink-500' },
    { name: 'TikTok', id: 'tiktok', color: 'bg-black' },
    { name: 'Pinterest', id: 'pinterest', color: 'bg-red-500' },
    { name: 'LinkedIn', id: 'linkedin', color: 'bg-blue-600' }
  ];

  const contentTypes = [
    'Lookbook', 'Behind the Scenes', 'Process Video', 'Styling Tips', 
    'Collection Launch', 'Designer Story', 'Trend Alert', 'Fashion Week'
  ];

  const sampleCaptions = {
    lookbook: [
      "✨ Introducing our latest collection - where minimalism meets bold statements. Each piece tells a story of modern elegance. #FashionForward #NewCollection",
      "🎨 Every thread, every cut, every detail - crafted with intention. This is fashion that speaks to your soul. #DesignerFashion #Craftsmanship",
      "💫 From sketch to runway - witness the journey of creation. This collection is our love letter to contemporary style. #FashionDesign #ModernStyle"
    ],
    behind: [
      "👗 Behind every great design is countless hours of passion, precision, and pure creativity. Take a peek into our design process! #BehindTheScenes",
      "✂️ From fabric selection to final fitting - the magic happens in the details. Here's how we bring visions to life. #DesignProcess",
      "🧵 Late nights, early mornings, and endless inspiration. This is what it takes to create fashion that matters. #DesignerLife"
    ]
  };

  const generateCaptions = () => {
    const captions = contentType === 'lookbook' ? sampleCaptions.lookbook : sampleCaptions.behind;
    setGeneratedCaptions(captions);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            Social Media Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137157983_325969c6.webp"
                alt="Social Media Dashboard"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <Button
                        key={platform.id}
                        variant={selectedPlatforms.includes(platform.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePlatform(platform.id)}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-3 h-3 rounded-full ${platform.color}`}></div>
                        {platform.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {contentTypes.map((type) => (
                      <Button
                        key={type}
                        variant={contentType === type.toLowerCase().replace(' ', '') ? "default" : "outline"}
                        size="sm"
                        onClick={() => setContentType(type.toLowerCase().replace(' ', ''))}
                        className="text-xs"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Launch Date</label>
                  <Input type="date" className="w-full" />
                </div>

                <Button onClick={generateCaptions} className="w-full">
                  Generate Captions
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Generated Content</h3>
              
              {generatedCaptions.length > 0 && (
                <div className="space-y-4">
                  {generatedCaptions.map((caption, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">Post {index + 1}</Badge>
                        <div className="flex gap-1">
                          {selectedPlatforms.map(platformId => {
                            const platform = platforms.find(p => p.id === platformId);
                            return platform ? (
                              <div
                                key={platformId}
                                className={`w-4 h-4 rounded-full ${platform.color}`}
                                title={platform.name}
                              ></div>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <Textarea
                        value={caption}
                        onChange={(e) => {
                          const newCaptions = [...generatedCaptions];
                          newCaptions[index] = e.target.value;
                          setGeneratedCaptions(newCaptions);
                        }}
                        className="min-h-20 text-sm"
                      />
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>{caption.length} characters</span>
                        <Button variant="ghost" size="sm">Copy</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="mt-4 p-3 bg-blue-50">
                <h4 className="font-semibold text-sm mb-2">Strategy Tips</h4>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>• Post consistently at optimal times</li>
                  <li>• Use 3-5 relevant hashtags per post</li>
                  <li>• Engage with your community daily</li>
                  <li>• Share behind-the-scenes content</li>
                  <li>• Collaborate with fashion influencers</li>
                </ul>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaStrategy;