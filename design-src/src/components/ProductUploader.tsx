import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, Upload, Sparkles } from 'lucide-react';
import { improveProductContent } from '@/utils/api';
import { v4 as uuidv4 } from 'uuid';

export interface ProductItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // data URL
  improving?: boolean;
}

interface ProductUploaderProps {
  collectionName?: string;
  collectionInspiration?: string;
  items: ProductItem[];
  onItemsChange: (items: ProductItem[]) => void;
}

export default function ProductUploader({
  collectionName,
  collectionInspiration,
  items,
  onItemsChange,
}: ProductUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      file =>
        new Promise<ProductItem>(resolve => {
          const reader = new FileReader();
          reader.onload = e =>
            resolve({
              id: uuidv4(),
              title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
              description: '',
              imageUrl: e.target?.result as string,
            });
          reader.readAsDataURL(file);
        }),
    );
    Promise.all(readers).then(newItems => onItemsChange([...items, ...newItems]));
  };

  const removeItem = (id: string) => onItemsChange(items.filter(i => i.id !== id));

  const setField = (id: string, field: 'title' | 'description', value: string) => {
    onItemsChange(items.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const improveItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    onItemsChange(items.map(i => (i.id === id ? { ...i, improving: true } : i)));
    try {
      const result = await improveProductContent({
        title: item.title,
        description: item.description,
        collectionName,
        collectionInspiration,
      });
      onItemsChange(
        items.map(i =>
          i.id === id
            ? { ...i, title: result.title, description: result.description, improving: false }
            : i,
        ),
      );
    } catch {
      onItemsChange(items.map(i => (i.id === id ? { ...i, improving: false } : i)));
    }
  };

  const improveAll = async () => {
    for (const item of items) {
      await improveItem(item.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop product images here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — multiple files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Bulk actions */}
      {items.length > 1 && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={improveAll}>
            <Sparkles className="h-3 w-3 mr-1" />
            Improve All with AI
          </Button>
        </div>
      )}

      {/* Per-image cards */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title || 'Product'}
                      className="w-28 h-28 object-cover rounded-md border"
                    />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Product title"
                        placeholder="Product title"
                        value={item.title}
                        onChange={e => setField(item.id, 'title', e.target.value)}
                        className="text-sm font-medium"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove image"
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Textarea
                      aria-label="Product description"
                      placeholder="Describe this piece — silhouette, fabric, what makes it special…"
                      value={item.description}
                      onChange={e => setField(item.id, 'description', e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={item.improving}
                        onClick={() => improveItem(item.id)}
                      >
                        {item.improving ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {item.improving ? 'Improving…' : 'Improve with AI'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          No images added yet. Upload your product photos above.
        </p>
      )}
    </div>
  );
}
