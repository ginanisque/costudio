import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CollectionData {
  name: string;
  launchYear: string;
  inspiration: string;
  targetAge: string;
  category: string;
  customCategory: string;
}

interface Props {
  onSubmit: (data: CollectionData) => void;
  initialData?: Partial<CollectionData> | null;
}

const CollectionForm: React.FC<Props> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState<CollectionData>({
    name: '',
    launchYear: '',
    inspiration: '',
    targetAge: '',
    category: '',
    customCategory: ''
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      } as CollectionData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialData || {})]);

  const categories = [
    'casual', 'street smart', 'luxury', 'ceremonial', 
    'special occasions', 'weddings', 'bridal', 'custom'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Fashion Collection Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Collection Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="year">Launch Year</Label>
            <Input
              id="year"
              type="number"
              value={formData.launchYear}
              onChange={(e) => setFormData({...formData, launchYear: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="inspiration">Inspiration</Label>
            <Textarea
              id="inspiration"
              value={formData.inspiration}
              onChange={(e) => setFormData({...formData, inspiration: e.target.value})}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="age">Target Age Range</Label>
            <Input
              id="age"
              placeholder="e.g., 18-35"
              value={formData.targetAge}
              onChange={(e) => setFormData({...formData, targetAge: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.category === 'custom' && (
            <div>
              <Label htmlFor="customCategory">Custom Category</Label>
              <Input
                id="customCategory"
                value={formData.customCategory}
                onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
              />
            </div>
          )}

          <Button type="submit" className="w-full">
            Generate Collection
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CollectionForm;
