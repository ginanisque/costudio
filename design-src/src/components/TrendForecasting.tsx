import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { toast } from './ui/use-toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { savePalette, updateCollection, computePaletteId, listCollections, savePromptSet, computePromptSetId } from '@/utils/storage';

const trendData = {
  colors: [
    { name: 'Digital Lime', hex: '#32CD32', trend: 95 },
    { name: 'Cosmic Cobalt', hex: '#0047AB', trend: 88 },
    { name: 'Peach Fuzz', hex: '#FFCBA4', trend: 82 },
    { name: 'Mocha Mousse', hex: '#A0522D', trend: 76 }
  ],
  styles: [
    { name: 'Oversized Blazers', category: 'Outerwear', trend: 92, season: `Fall ${new Date().getFullYear()}` },
    { name: 'Cargo Pants', category: 'Bottoms', trend: 89, season: `Spring ${new Date().getFullYear()}` },
    { name: 'Sheer Layers', category: 'Tops', trend: 85, season: `Summer ${new Date().getFullYear()}` },
    { name: 'Platform Shoes', category: 'Footwear', trend: 78, season: 'All Seasons' }
  ],
  materials: [
    { name: 'Recycled Polyester', sustainability: 95, popularity: 87 },
    { name: 'Organic Cotton', sustainability: 92, popularity: 84 },
    { name: 'Tencel', sustainability: 89, popularity: 76 },
    { name: 'Hemp Blend', sustainability: 94, popularity: 68 }
  ]
};

export const TrendForecasting: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState('colors');
  const [live, setLive] = useLocalStorage<boolean>('tf_live', true);
  const [intervalMs, setIntervalMs] = useLocalStorage<number>('tf_interval', 2500);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const [data, setData] = useState(trendData);
  const timerRef = useRef<number | null>(null);

  // jitter helper
  const jitter = (v: number, min = 0, max = 100, step = 3) => {
    const delta = (Math.random() * step * 2 - step);
    let nv = Math.round(v + delta);
    if (Math.random() < 0.02) nv += Math.random() < 0.5 ? -10 : 10; // occasional spikes
    return Math.min(max, Math.max(min, nv));
  };

  useEffect(() => {
    if (!live) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    // simulate polling / streaming updates
    timerRef.current = window.setInterval(() => {
      setData((prev) => ({
        colors: prev.colors.map((c) => ({ ...c, trend: jitter(c.trend) })),
        styles: prev.styles.map((s) => ({ ...s, trend: jitter(s.trend) })),
        materials: prev.materials.map((m) => ({
          ...m,
          sustainability: jitter(m.sustainability, 60, 100, 2),
          popularity: jitter(m.popularity, 40, 100, 2),
        })),
      }));
      setLastUpdated(new Date().toLocaleTimeString());
    }, intervalMs) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [live, intervalMs]);

  const statusDot = (
    <span className={`inline-block h-2 w-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137377178_b659bf54.webp" 
          alt="Trend Forecasting Dashboard" 
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h2 className="text-3xl font-bold mb-2">Trend Forecasting Studio</h2>
        <p className="text-gray-600">Stay ahead with AI-powered fashion insights</p>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Color Trends</TabsTrigger>
            <TabsTrigger value="styles">Style Trends</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">{statusDot} Live</div>
          <Switch checked={live} onCheckedChange={(v)=>{ setLive(v); toast({ title: v? 'Live updates on':'Live updates off' }); }} />
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="poll" className="text-xs">Interval (ms)</Label>
            <Input id="poll" type="number" className="h-8 w-24" min={500} step={100} value={intervalMs}
              onChange={(e)=> setIntervalMs(Math.max(200, Number(e.target.value) || 0))} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              try {
                const currentId = localStorage.getItem('fashionAI.currentCollectionId');
                if (!currentId) { toast({ title: 'No active collection', description: 'Create or load a collection first.', variant: 'destructive' }); return; }
                // Save palette from top colors
                const palName = `TrendPalette-${new Date().toISOString().slice(0,10)}`;
                const paletteId = computePaletteId(palName);
                savePalette({ id: paletteId, name: palName, colors: data.colors.map(c=> c.hex), createdAt: new Date().toISOString() });
                // Save style prompts
                const psName = `TrendStyles-${new Date().toISOString().slice(0,10)}`;
                const promptSetId = computePromptSetId(psName);
                const items = data.styles.map(s=> `${s.name} - ${s.category} - ${s.season}`);
                savePromptSet({ id: promptSetId, name: psName, items, createdAt: new Date().toISOString() });
                updateCollection(currentId, { paletteId: paletteId, promptSetId });
                try {
                  localStorage.setItem('trend.colors', JSON.stringify(data.colors.map(c=> c.hex)));
                  localStorage.setItem('trend.styles', JSON.stringify(data.styles.map(s=> s.name)));
                } catch { /* ignore */ }
                try { window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'colors' } })); } catch { /* ignore */ }
                toast({ title: 'Applied trends to collection', description: 'Palette + styles available under Colors & Collection' });
              } catch { /* ignore */ }
            }}
          >
            Apply to Collection
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trending Colors {currentYear} <span className="text-xs font-normal text-muted-foreground">(updated {lastUpdated})</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.colors.map((color, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div 
                      className="w-16 h-16 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{color.name}</h3>
                      <p className="text-sm text-gray-600">{color.hex}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Trend Score</span>
                          <span>{color.trend}%</span>
                        </div>
                        <Progress value={color.trend} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="styles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Style Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.styles.map((style, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{style.name}</h3>
                        <Badge variant="outline">{style.category}</Badge>
                      </div>
                      <Badge>{style.season}</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Trend Strength</span>
                        <span>{style.trend}%</span>
                      </div>
                      <Progress value={style.trend} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sustainable Materials Rising</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.materials.map((material, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">{material.name}</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Sustainability Score</span>
                          <span>{material.sustainability}%</span>
                        </div>
                        <Progress value={material.sustainability} className="h-2 bg-green-100">
                          <div className="h-full bg-green-500 rounded-full transition-all" 
                               style={{width: `${material.sustainability}%`}} />
                        </Progress>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Market Popularity</span>
                          <span>{material.popularity}%</span>
                        </div>
                        <Progress value={material.popularity} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>AI Trend Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm"><strong>Market Prediction:</strong> Sustainable materials will dominate {currentYear} with 40% growth in consumer demand.</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm"><strong>Color Forecast:</strong> Digital Lime emerges as the color of innovation, perfect for tech-wear collections.</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm"><strong>Style Alert:</strong> Oversized silhouettes continue to dominate, with focus on comfort and versatility.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className="text-sm text-muted-foreground">Last updated: {lastUpdated}</div>
            <Button className="" onClick={()=>{ setData(trendData); toast({ title: 'Report regenerated', description: 'Reset to baseline and applied latest updates' }) }}>Generate Custom Trend Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
