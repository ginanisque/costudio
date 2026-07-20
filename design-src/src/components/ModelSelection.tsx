import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from './ui/use-toast';
import { updateCollection } from '@/utils/storage';
import { modelsCatalog as models } from '@/config/models';

const ModelSelection = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [filterAge, setFilterAge] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // models imported from config

  // Read the current collection id saved by the Collection tab
  useEffect(() => {
    try {
      const id = localStorage.getItem('fashionAI.currentCollectionId');
      setCollectionId(id);
    } catch { /* ignore */ }
  }, []);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const ageNum = Number(m.age) || 0;
      const okAge =
        filterAge === 'all' ||
        (filterAge === '20-25' && ageNum >= 20 && ageNum <= 25) ||
        (filterAge === '26-30' && ageNum >= 26 && ageNum <= 30) ||
        (filterAge === '30+' && ageNum >= 30);
      const okStyle = filterStyle === 'all' || m.style === filterStyle;
      return okAge && okStyle;
    });
  }, [models, filterAge, filterStyle]);

  const attachToCollection = () => {
    if (!collectionId) { toast({ title: 'No collection selected', description: 'Save your collection first in the Collection tab.' }); return; }
    if (selectedModels.length === 0) { toast({ title: 'No models selected' }); return; }
    try {
      updateCollection(collectionId, { modelIds: selectedModels });
      toast({ title: 'Models added to collection', description: `${selectedModels.length} selected` });
    } catch {
      toast({ title: 'Failed to attach models', description: 'Please try saving the collection again.' });
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
            Model Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Age Range</label>
              <div className="flex gap-2">
                {['all', '20-25', '26-30', '30+'].map((age) => (
                  <Button
                    key={age}
                    variant={filterAge === age ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterAge(age)}
                  >
                    {age}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Style</label>
              <div className="flex gap-2">
                {['all', 'Editorial', 'Commercial', 'High Fashion', 'Lifestyle'].map((style) => (
                  <Button
                    key={style}
                    variant={filterStyle === style ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStyle(style)}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredModels.map((model) => (
              <Card
                key={model.id}
                className={`cursor-pointer transition-all ${
                  selectedModels.includes(model.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => toggleModel(model.id)}
              >
                <CardContent className="p-3">
                  <div className="relative">
                    <img
                      src={model.image}
                      alt={model.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Checkbox
                      checked={selectedModels.includes(model.id)}
                      className="absolute top-2 right-2 bg-white"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <h3 className="font-semibold text-sm">{model.name}</h3>
                    <p className="text-xs text-gray-600">{model.ethnicity}</p>
                    <div className="flex justify-center gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {model.age}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {model.style}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedModels.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold mb-2">Selected Models ({selectedModels.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map((modelId) => {
                    const model = models.find(m => m.id === modelId);
                    return model ? (
                      <Badge key={modelId} variant="default">
                        {model.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={attachToCollection}>
                  Add to Collection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelSelection;
