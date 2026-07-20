import React, { useMemo, useState } from 'react';
import { toast } from './ui/use-toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import PaletteLibrary from './PaletteLibrary';

const ColorTheoryTool = () => {
  type ColorScheme = 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'split-complementary' | 'tetradic';
  const [selectedColor, setSelectedColor] = useLocalStorage<string>('ct_color', '#FF6B6B');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('complementary');
  const SCHEMES: ColorScheme[] = ['complementary', 'analogous', 'triadic', 'monochromatic', 'split-complementary', 'tetradic'];
  const [analogousAngle, setAnalogousAngle] = useLocalStorage<number>('ct_angle', 30);
  const [monoSteps, setMonoSteps] = useLocalStorage<number>('ct_steps', 4);
  const [monoSpread, setMonoSpread] = useLocalStorage<number>('ct_spread', 40);
  const [labelMode, setLabelMode] = useLocalStorage<'hex' | 'rgb' | 'hsl' | 'all'>('ct_label', 'all');
  const [trendColors, setTrendColors] = React.useState<string[] | null>(null);
  const [selectedTrend, setSelectedTrend] = React.useState<Record<string, boolean>>({});
  const [overrideColors, setOverrideColors] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    try { const raw = localStorage.getItem('trend.colors'); if (raw) setTrendColors(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

  // --- Color helpers ---
  function hexToRgb(hex: string) {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h: number, s: number, l: number) {
    h /= 360; s /= 100; l /= 100;
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
  }

  function rotateHue(h: number, deg: number) {
    const nh = (h + deg) % 360;
    return nh < 0 ? nh + 360 : nh;
  }

  function genPalette(hex: string, scheme: typeof colorScheme) {
    const { r, g, b } = hexToRgb(hex);
    const base = rgbToHsl(r, g, b);
    const out: string[] = [];
    if (scheme === 'complementary') {
      const comp = { ...base, h: rotateHue(base.h, 180) };
      out.push(hex, rgbToHex(...Object.values(hslToRgb(comp.h, comp.s, comp.l)) as [number, number, number]));
    } else if (scheme === 'analogous') {
      const a1 = rotateHue(base.h, -analogousAngle);
      const a2 = base.h;
      const a3 = rotateHue(base.h, analogousAngle);
      for (const h of [a1, a2, a3]) {
        const { r, g, b } = hslToRgb(h, base.s, base.l);
        out.push(rgbToHex(r, g, b));
      }
    } else if (scheme === 'triadic') {
      for (const h of [base.h, rotateHue(base.h, 120), rotateHue(base.h, 240)]) {
        const { r, g, b } = hslToRgb(h, base.s, base.l);
        out.push(rgbToHex(r, g, b));
      }
    } else if (scheme === 'monochromatic') {
      // vary lightness around base using N steps across [-spread, +spread]
      const steps = Math.max(1, Math.round(monoSteps));
      for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0 : (i / (steps - 1)) * 2 - 1; // [-1,1]
        const dl = t * monoSpread;
        const l = clamp(Math.round(base.l + dl), 5, 95);
        const { r, g, b } = hslToRgb(base.h, base.s, l);
        out.push(rgbToHex(r, g, b));
      }
    } else if (scheme === 'split-complementary') {
      // base and hues ~150° and 210° from base (complement ±30°)
      const angle = clamp(analogousAngle, 5, 80);
      const h1 = rotateHue(base.h, 180 - angle);
      const h2 = rotateHue(base.h, -(180 - angle));
      for (const h of [base.h, h1, h2]) {
        const { r, g, b } = hslToRgb(h, base.s, base.l);
        out.push(rgbToHex(r, g, b));
      }
    } else if (scheme === 'tetradic') {
      // rectangle: two complementary pairs separated by 60°
      for (const h of [base.h, rotateHue(base.h, 60), rotateHue(base.h, 180), rotateHue(base.h, 240)]) {
        const { r, g, b } = hslToRgb(h, base.s, base.l);
        out.push(rgbToHex(r, g, b));
      }
    }
    return out;
  }

  const generatedColors = useMemo(() => genPalette(selectedColor, colorScheme), [selectedColor, colorScheme]);
  
  function colorDetails(hex: string) {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    return {
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  }

  function renderLabel(hex: string) {
    const details = colorDetails(hex);
    if (labelMode === 'hex') return hex;
    if (labelMode === 'rgb') return details.rgb;
    if (labelMode === 'hsl') return details.hsl;
    return `${hex}\n${details.rgb}\n${details.hsl}`;
  }

  const seasonalPalettes = {
    spring: ['#FFB6C1', '#98FB98', '#87CEEB', '#F0E68C'],
    summer: ['#FF69B4', '#00CED1', '#9370DB', '#32CD32'],
    fall: ['#D2691E', '#B22222', '#DAA520', '#8B4513'],
    winter: ['#000080', '#8B0000', '#2F4F4F', '#800080']
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-blue-500"></div>
            Color Theory Master
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(trendColors) && trendColors.length > 0 && (
            <div className="mb-4 p-3 border rounded bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Trend Palette Available</div>
                <Button size="sm" variant="outline" onClick={()=> { try { localStorage.removeItem('trend.colors'); } catch { /* ignore */ }; setTrendColors(null); }}>Dismiss</Button>
              </div>
              <div className="flex flex-col gap-2 mb-2">
                {trendColors.slice(0,18).map((c,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <button
                      className={`w-6 h-6 rounded border ${selectedTrend[c] ? 'ring-2 ring-primary' : ''}`}
                      style={{backgroundColor:c}}
                      onClick={() => setSelectedTrend(prev => ({ ...prev, [c]: !prev[c] }))}
                      title={c}
                      aria-label={`Select ${c}`}
                    />
                    <code className="text-xs text-muted-foreground min-w-20">{c}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedColor(c); toast({ title: 'Color applied', description: c }); }}
                    >
                      Use in Collection
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={()=> {
                  const name = prompt('Save trend palette as…','Trend Palette') || 'Trend Palette';
                  import('@/utils/storage').then(({ savePalette })=> savePalette({ id: '', name, colors: trendColors, createdAt: new Date().toISOString() }));
                  toast({ title: 'Palette saved', description: 'Find it in Palettes below' });
                }}>Save as Palette</Button>
                <Button size="sm" variant="outline" onClick={()=> { setSelectedColor(trendColors[0]); }}>Use First Color</Button>
                <Button size="sm" variant="outline" onClick={()=> {
                  const chosen = trendColors.filter(c => selectedTrend[c]);
                  if (chosen.length === 0) { toast({ title: 'Select at least one color' }); return; }
                  setOverrideColors(chosen);
                  toast({ title: 'Working palette set', description: `${chosen.length} color(s)` });
                }}>Use Selected as Working Palette</Button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137134776_4953b2cb.webp"
                alt="Color Wheel"
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full h-12 rounded-lg border cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color Scheme</label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEMES.map((scheme) => (
                      <Button
                        key={scheme}
                        variant={colorScheme === scheme ? "default" : "outline"}
                        size="sm"
                        onClick={() => setColorScheme(scheme)}
                        className="capitalize"
                      >
                        {scheme}
                      </Button>
                    ))}
                  </div>
                </div>
                {(colorScheme === 'analogous' || colorScheme === 'split-complementary') && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <Label htmlFor="angle">Angle (°)</Label>
                      <Input
                        id="angle"
                        type="number"
                        min={5}
                        max={80}
                        value={analogousAngle}
                        onChange={(e) => setAnalogousAngle(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
                {colorScheme === 'monochromatic' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <Label htmlFor="steps">Steps</Label>
                      <Input
                        id="steps"
                        type="number"
                        min={1}
                        max={8}
                        value={monoSteps}
                        onChange={(e) => setMonoSteps(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="spread">Spread (lightness ±)</Label>
                      <Input
                        id="spread"
                        type="number"
                        min={5}
                        max={90}
                        value={monoSpread}
                        onChange={(e) => setMonoSpread(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Generated Palette</h3>
              <div className="flex items-end justify-between gap-2 mb-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(generatedColors));
                        toast({ title: 'Copied', description: 'Palette copied as JSON array' });
                      } catch {
                        toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                      }
                    }}
                  >
                    Copy All (JSON)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedColors.join(','));
                        toast({ title: 'Copied', description: 'Palette copied as CSV' });
                      } catch {
                        toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                      }
                    }}
                  >
                    Copy All (CSV)
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <Button size="sm" variant={labelMode==='hex'? 'default':'outline'} onClick={()=>setLabelMode('hex')}>HEX</Button>
                  <Button size="sm" variant={labelMode==='rgb'? 'default':'outline'} onClick={()=>setLabelMode('rgb')}>RGB</Button>
                  <Button size="sm" variant={labelMode==='hsl'? 'default':'outline'} onClick={()=>setLabelMode('hsl')}>HSL</Button>
                  <Button size="sm" variant={labelMode==='all'? 'default':'outline'} onClick={()=>setLabelMode('all')}>All</Button>
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(generatedColors));
                      toast({ title: 'Copied', description: 'Palette copied as JSON array' });
                    } catch {
                      toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                    }
                  }}
                >
                  Copy All (JSON)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(generatedColors.join(','));
                      toast({ title: 'Copied', description: 'Palette copied as CSV' });
                    } catch {
                      toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                    }
                  }}
                >
                  Copy All (CSV)
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {(overrideColors ?? generatedColors).map((color, index) => (
                  <div key={index} className="text-center">
                    <button
                      type="button"
                      className="w-full h-16 rounded-lg border cursor-pointer active:scale-[0.99] flex items-center justify-center text-center px-1"
                      style={{ backgroundColor: color, color: (function(){
                        const hex = color;
                        const h = hex.replace('#','');
                        const r = parseInt(h.substring(0,2),16);
                        const g = parseInt(h.substring(2,4),16);
                        const b = parseInt(h.substring(4,6),16);
                        const sr=r/255, sg=g/255, sb=b/255;
                        const lin=(u:number)=> (u<=0.03928? u/12.92: Math.pow((u+0.055)/1.055,2.4));
                        const L=0.2126*lin(sr)+0.7152*lin(sg)+0.0722*lin(sb);
                        return L>0.5? '#000000':'#FFFFFF';
                      })() }}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(color);
                          toast({ title: 'Copied', description: `${color} copied to clipboard` });
                        } catch {
                          toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                        }
                      }}
                      aria-label={`Copy ${color}`}
                    >
                      <span className="whitespace-pre-line text-[10px] md:text-xs font-mono leading-tight">
                        {renderLabel(color)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const seasonal = JSON.stringify(seasonalPalettes);
                      await navigator.clipboard.writeText(seasonal);
                      toast({ title: 'Copied', description: 'Seasonal palettes copied as JSON' });
                    } catch {
                      toast({ title: 'Copy failed', description: 'Unable to access clipboard' });
                    }
                  }}
                >
                  Copy Seasonal Palettes (JSON)
                </Button>
              </div>
              <h3 className="font-semibold mb-3">Seasonal Palettes</h3>
              <div className="space-y-3">
                {Object.entries(seasonalPalettes).map(([season, colors]) => (
                  <div key={season} className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize min-w-16">
                      {season}
                    </Badge>
                    <div className="flex gap-1">
                      {colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        ></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              <div className="mt-6">
              <PaletteLibrary currentColors={(overrideColors ?? generatedColors)} />
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorTheoryTool;

