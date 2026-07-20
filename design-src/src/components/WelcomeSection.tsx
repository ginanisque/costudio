import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const WelcomeSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-xl overflow-hidden mb-8">
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137039569_5c961aa0.webp"
          alt="Costudio Design Workspace"
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="text-white p-8">
            <h1 className="text-4xl font-bold mb-2">Welcome to Costudio Design</h1>
            <p className="text-lg opacity-90">Create together, then turn every design into a viable product</p>
          </div>
        </div>
      </div>
      <div className="text-center space-y-4">
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          A collaborative workspace for fashion designers, stylists, and design students.
          Build cohesive collections, share creative decisions, and send finished concepts directly into costing.
        </p>
        <div className="flex justify-center space-x-2">
          <Badge variant="outline">Fashion Students</Badge>
          <Badge variant="outline">Emerging Designers</Badge>
          <Badge variant="outline">Professional</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">How Costudio Works</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p><strong>1. Your Identity:</strong> Define your style and inspirations</p>
              <p><strong>2. Designer Profile:</strong> Professional profile creation</p>
              <p><strong>3. Purpose & Audience:</strong> Target demographic analysis</p>
              <p><strong>4. Saved Settings:</strong> Store and reuse preferences</p>
              <p><strong>5. Launch Planning:</strong> Season-appropriate recommendations</p>
              <p><strong>6. Color Theory:</strong> Trending palettes and materials</p>
              <p><strong>7. Style & Inspiration:</strong> Upload and translate visuals</p>
            </div>
            <div className="space-y-2">
              <p><strong>8. Body Shape Styling:</strong> Fit and silhouette advice</p>
              <p><strong>9. Models & Photography:</strong> Editorial visual creation</p>
              <p><strong>10. Collection Description:</strong> Compelling overviews</p>
              <p><strong>11. Social Media:</strong> Optimized content strategy</p>
              <p><strong>12. Lookbook Assembly:</strong> Presentation-ready formats</p>
              <p><strong>13. Professional Catalogue:</strong> Industry-standard layouts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeSection;
