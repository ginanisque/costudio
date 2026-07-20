import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import FabricLibrary from './FabricLibrary';
import { toast } from './ui/use-toast';
import { computeCollectionId, computeFabricId, listCollections, saveFabric, updateCollection } from '@/utils/storage';

const fabrics = [
  {
    id: 1,
    name: 'Luxury Silk',
    type: 'Natural',
    weight: 'Light',
    drape: 'Excellent',
    season: 'All',
    price: '$$$',
    properties: ['Breathable', 'Lustrous', 'Delicate'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137361636_65d91a27.webp'
  },
  {
    id: 2,
    name: 'Cotton Twill',
    type: 'Natural',
    weight: 'Medium',
    drape: 'Good',
    season: 'Spring/Summer',
    price: '$$',
    properties: ['Durable', 'Breathable', 'Easy Care'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137363737_bbbe59c0.webp'
  },
  {
    id: 3,
    name: 'Wool Crepe',
    type: 'Natural',
    weight: 'Medium',
    drape: 'Excellent',
    season: 'Fall/Winter',
    price: '$$$',
    properties: ['Wrinkle Resistant', 'Warm', 'Professional'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137366033_48deeb29.webp'
  },
  {
    id: 4,
    name: 'Linen Blend',
    type: 'Natural',
    weight: 'Light',
    drape: 'Fair',
    season: 'Summer',
    price: '$$',
    properties: ['Cool', 'Casual', 'Textured'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137368022_950df97b.webp'
  },
  {
    id: 5,
    name: 'Ponte Knit',
    type: 'Synthetic',
    weight: 'Medium',
    drape: 'Good',
    season: 'All',
    price: '$',
    properties: ['Stretch', 'Recovery', 'Machine Wash'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137370367_5ff93667.webp'
  },
  {
    id: 6,
    name: 'Chiffon',
    type: 'Synthetic',
    weight: 'Sheer',
    drape: 'Excellent',
    season: 'Spring/Summer',
    price: '$$',
    properties: ['Flowing', 'Layerable', 'Feminine'],
    image: 'https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137372646_345fe2e6.webp'
  }
];

export const FabricSelection: React.FC = () => {
  const [selectedFabrics, setSelectedFabrics] = useState<number[]>([]);
  const [filter, setFilter] = useState('all');
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const toggleFabric = (id: number) => {
    setSelectedFabrics(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const filteredFabrics = fabrics.filter(fabric => {
    if (filter === 'all') return true;
    return fabric.type.toLowerCase() === filter;
  });

  useEffect(() => {
    try {
      const id = localStorage.getItem('fashionAI.currentCollectionId');
      setCollectionId(id);
    } catch { /* ignore */ }
  }, []);

  const mapDrapeToFlow = (d: string): 'firm' | 'soft' | 'flowing' | 'stiff' | undefined => {
    const x = (d || '').toLowerCase();
    if (x.includes('excellent') || x.includes('sheer')) return 'flowing';
    if (x.includes('good')) return 'soft';
    if (x.includes('fair')) return 'firm';
    return undefined;
  };

  const attachSelected = () => {
    if (!collectionId) { toast({ title: 'No collection selected', description: 'Save your collection first in the Collection tab.' }); return; }
    if (selectedFabrics.length === 0) { toast({ title: 'No fabrics selected' }); return; }
    try {
      const ids: string[] = [];
      const now = new Date().toISOString();
      for (const fid of selectedFabrics) {
        const f = fabrics.find(x => x.id === fid);
        if (!f) continue;
        const id = computeFabricId(f.name);
        ids.push(id);
        // Save to fabric library (id will be set inside saveFabric)
        saveFabric({ id: '', name: f.name, description: `${f.weight} weight, ${f.season}. ${f.properties.join(', ')}`, content: f.type, flow: mapDrapeToFlow(f.drape), image: f.image, createdAt: now });
      }
      const existing = listCollections().find(c => c.id === collectionId)?.fabricIds || [];
      const merged = Array.from(new Set([...(existing || []), ...ids]));
      updateCollection(collectionId, { fabricIds: merged });
      toast({ title: 'Fabrics added to collection', description: `${ids.length} selected` });
    } catch {
      toast({ title: 'Failed to add fabrics', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137360591_5207a6a6.webp" 
          alt="Fabric Selection" 
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h2 className="text-3xl font-bold mb-2">Fabric Selection Studio</h2>
        <p className="text-gray-600">Choose the perfect fabrics for your collection</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Fabrics</TabsTrigger>
          <TabsTrigger value="natural">Natural</TabsTrigger>
          <TabsTrigger value="synthetic">Synthetic</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFabrics.map((fabric) => (
              <Card 
                key={fabric.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedFabrics.includes(fabric.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => toggleFabric(fabric.id)}
              >
                <CardHeader className="p-4">
                  <img 
                    src={fabric.image} 
                    alt={fabric.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <CardTitle className="text-lg">{fabric.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Weight:</span>
                      <Badge variant="outline">{fabric.weight}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Drape:</span>
                      <span className="text-sm">{fabric.drape}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Season:</span>
                      <span className="text-sm">{fabric.season}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="text-sm font-bold">{fabric.price}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fabric.properties.map((prop, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {prop}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedFabrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Fabrics ({selectedFabrics.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedFabrics.map(id => {
                const fabric = fabrics.find(f => f.id === id);
                return fabric ? (
                  <Badge key={id} variant="default">
                    {fabric.name}
                  </Badge>
                ) : null;
              })}
            </div>
            <Button className="w-full" onClick={attachSelected}>Add to Collection</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
