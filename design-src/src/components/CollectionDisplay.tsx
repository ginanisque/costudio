import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { computeCollectionId, listCollections, updateCollection } from '@/utils/storage';

interface CollectionData {
  name: string;
  launchYear: string;
  inspiration: string;
  targetAge: string;
  category: string;
  customCategory: string;
}

interface CollectionDisplayProps {
  collection: CollectionData;
  generatedTitle: string;
  generatedDescription: string;
  attachedPaletteColors?: string[];
  attachedFabrics?: Array<{ id: string; name: string; image?: string; content?: string; flow?: string }>;
  attachedModels?: Array<{ id: string; name: string; image?: string; age?: string; style?: string; ethnicity?: string }>;
}

const CollectionDisplay: React.FC<CollectionDisplayProps> = ({
  collection,
  generatedTitle,
  generatedDescription,
  attachedPaletteColors,
  attachedFabrics,
  attachedModels,
}) => {
  const displayCategory = collection.category === 'custom' 
    ? collection.customCategory 
    : collection.category;

  const removeModel = (modelId: string) => {
    try {
      const id = computeCollectionId(collection);
      const current = listCollections().find(c => c.id === id)?.modelIds || [];
      const next = current.filter((m) => m !== modelId);
      updateCollection(id, { modelIds: next });
      toast({ title: 'Model removed from collection' });
    } catch { /* ignore */ }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{generatedTitle || collection.name}</CardTitle>
            <p className="text-muted-foreground mt-1">Launch Year: {collection.launchYear}</p>
          </div>
          <Badge variant="outline" className="capitalize">
            {displayCategory}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {collection.targetAge && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Target Audience
            </h4>
            <p className="mt-1">{collection.targetAge} years old</p>
          </div>
        )}

        {collection.inspiration && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Inspiration
            </h4>
            <p className="mt-1">{collection.inspiration}</p>
          </div>
        )}

        {generatedDescription && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Collection Description
            </h4>
            <p className="mt-1 leading-relaxed">{generatedDescription}</p>
          </div>
        )}

        {attachedPaletteColors && attachedPaletteColors.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attached Palette</h4>
            <div className="flex gap-1 mt-2">
              {attachedPaletteColors.slice(0, 12).map((c, i) => (
                <div key={i} title={c} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}

        {attachedFabrics && attachedFabrics.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attached Fabrics</h4>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {attachedFabrics.map((f) => (
                <div key={f.id} className="flex items-center gap-2 border rounded p-2">
                  {f.image ? (
                    <img src={f.image} alt={f.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{[f.content, f.flow].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {attachedModels && attachedModels.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Attached Models</h4>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {attachedModels.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 border rounded p-2">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{[m.style, m.ethnicity, m.age && (m.age + 'y')].filter(Boolean).join(' · ')}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => removeModel(m.id)}>Remove</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionDisplay;
