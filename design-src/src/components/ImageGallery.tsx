import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface GeneratedImage {
  id: string;
  prompt: string;
  title?: string;
  description?: string;
  imageUrl: string;
  selected: boolean;
}

interface ImageGalleryProps {
  images: GeneratedImage[];
  onImageSelect: (id: string) => void;
  onDownloadSelected: () => void;
  onUpdateImage?: (id: string, update: Partial<GeneratedImage & { category?: string }>) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageSelect,
  onDownloadSelected,
  onUpdateImage,
}) => {
  const selectedCount = images.filter(img => img.selected).length;
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Product Gallery</h3>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedCount} selected</Badge>
            <Button onClick={onDownloadSelected} size="sm">
              Download Selected
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map(image => (
          <Card
            key={image.id}
            className={`cursor-pointer transition-all ${image.selected ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onImageSelect(image.id)}
          >
            <CardContent className="p-4">
              {/* Image */}
              <div className="relative aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl}
                    alt={image.title || image.prompt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-500 text-center p-4">
                    <div>
                      <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-2" />
                      <p className="text-xs">No image</p>
                    </div>
                  </div>
                )}
                {/* Piece ID badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span
                    className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded select-all"
                    title="Piece ID"
                  >
                    {image.id}
                  </span>
                  <button
                    type="button"
                    className="bg-white/80 hover:bg-white text-[10px] px-1.5 py-0.5 rounded"
                    title="Copy ID"
                    onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(image.id);
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Title & description — editable inline */}
              {editingId === image.id ? (
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <Input
                    aria-label="Edit title"
                    placeholder="Product title"
                    value={image.title ?? ''}
                    onChange={e => onUpdateImage?.(image.id, { title: e.target.value })}
                    className="text-sm font-medium"
                  />
                  <Textarea
                    aria-label="Edit description"
                    placeholder="Product description"
                    value={image.description ?? image.prompt}
                    rows={2}
                    className="text-sm resize-none"
                    onChange={e => onUpdateImage?.(image.id, { description: e.target.value })}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {image.title && (
                    <p className="text-sm font-semibold line-clamp-1">{image.title}</p>
                  )}
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {image.description || image.prompt}
                  </p>
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingId(image.id);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {images.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No products yet. Upload images in the Upload tab.</p>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
