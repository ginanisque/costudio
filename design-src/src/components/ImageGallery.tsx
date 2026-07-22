import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { calculateProductCosting, formatProductMoney, type ProductCosting } from '@/utils/productCosting';

interface GeneratedImage {
  id: string;
  prompt: string;
  title?: string;
  description?: string;
  imageUrl: string;
  selected: boolean;
  costing?: ProductCosting;
}

interface ImageGalleryProps {
  images: GeneratedImage[];
  onImageSelect: (id: string) => void;
  onDownloadSelected: () => void;
  onUpdateImage?: (id: string, update: Partial<GeneratedImage & { category?: string }>) => void;
  currencySymbol?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageSelect,
  onDownloadSelected,
  onUpdateImage,
  currencySymbol = '$',
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
        {images.map(image => {
          const costing = { productionQuantity: 1, markupPercent: 50, ...(image.costing || {}) };
          const totals = calculateProductCosting(costing);
          const updateCosting = (patch: Partial<ProductCosting>) => onUpdateImage?.(image.id, { costing: { ...costing, ...patch } });
          const numberValue = (raw: string) => raw === '' ? undefined : Math.max(0, Number(raw) || 0);
          return (
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
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Quick product costing</p>
                      <p className="text-xs text-muted-foreground">Internal working values; only the optional selling price is included in the portfolio.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs">Fabric cost per yard
                        <Input type="number" min="0" step="0.01" value={costing.fabricCostPerUnit ?? ''} onChange={e=>updateCosting({fabricCostPerUnit:numberValue(e.target.value)})} />
                      </label>
                      <label className="text-xs">Yardage per item
                        <Input type="number" min="0" step="0.01" value={costing.fabricYardage ?? ''} onChange={e=>updateCosting({fabricYardage:numberValue(e.target.value)})} />
                      </label>
                      <label className="text-xs">Production time per item (hours)
                        <Input type="number" min="0" step="0.25" value={costing.productionHours ?? ''} onChange={e=>updateCosting({productionHours:numberValue(e.target.value)})} />
                      </label>
                      <label className="text-xs">Labour rate per hour
                        <Input type="number" min="0" step="0.01" value={costing.hourlyRate ?? ''} onChange={e=>updateCosting({hourlyRate:numberValue(e.target.value)})} />
                      </label>
                      <label className="text-xs">Production quantity
                        <Input type="number" min="1" step="1" value={costing.productionQuantity ?? 1} onChange={e=>updateCosting({productionQuantity:Math.max(1, Math.round(numberValue(e.target.value) || 1))})} />
                      </label>
                      <label className="text-xs">Other cost per item
                        <Input type="number" min="0" step="0.01" value={costing.otherCostPerItem ?? ''} onChange={e=>updateCosting({otherCostPerItem:numberValue(e.target.value)})} />
                      </label>
                      <label className="text-xs col-span-2">Price markup (%)
                        <Input type="number" min="0" step="1" value={costing.markupPercent ?? 50} onChange={e=>updateCosting({markupPercent:numberValue(e.target.value)})} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Cost per item</span><strong className="block text-sm">{formatProductMoney(totals.unitCost, currencySymbol)}</strong></div>
                      <div><span className="text-muted-foreground">Suggested price</span><strong className="block text-sm text-primary">{formatProductMoney(totals.unitPrice, currencySymbol)}</strong></div>
                      <div><span className="text-muted-foreground">Quantity</span><strong className="block text-sm">{totals.quantity}</strong></div>
                      <div><span className="text-muted-foreground">Batch production cost</span><strong className="block text-sm">{formatProductMoney(totals.productionCost, currencySymbol)}</strong></div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input type="checkbox" checked={Boolean(costing.showPrice)} onChange={e=>updateCosting({showPrice:e.target.checked})} />
                      Show suggested price in Portfolio and catalogue
                    </label>
                  </div>
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
                  {costing.showPrice && totals.unitPrice > 0 && <p className="text-sm font-semibold text-primary">{formatProductMoney(totals.unitPrice, currencySymbol)}</p>}
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingId(image.id);
                      }}
                    >
                      Edit &amp; Cost
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
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
