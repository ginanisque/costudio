import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PromptInputProps {
  onPromptsSubmit: (prompts: string[]) => void;
  initialPrompts?: string[];
  onBroadcast?: (prompts: string[]) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onPromptsSubmit, initialPrompts, onBroadcast }) => {
  const [promptText, setPromptText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (initialPrompts && initialPrompts.length) {
      setPromptText(initialPrompts.join('\n'));
    }
  }, [initialPrompts?.join('\n')]);

  const handleTextSubmit = () => {
    const prompts = promptText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (prompts.length > 0) {
      onPromptsSubmit(prompts);
    }
  };
  const handleBroadcast = () => {
    const prompts = promptText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (prompts.length > 0) {
      onBroadcast?.(prompts);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const prompts = text
          .split(/[\n,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        onPromptsSubmit(prompts);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Image Generation Prompts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="prompts">Enter Prompts (one per line)</Label>
          <Textarea
            id="prompts"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="elegant evening gown with flowing fabric&#10;modern streetwear jacket with bold patterns&#10;luxury handbag with gold accents"
            rows={6}
            className="mt-2"
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleTextSubmit}>
              Generate from Text
            </Button>
            {onBroadcast && (
              <Button type="button" variant="outline" onClick={handleBroadcast}>
                Share Prompts
              </Button>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="csv">Or Upload CSV File</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptInput;
