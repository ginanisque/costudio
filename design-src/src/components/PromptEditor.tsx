import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface PromptEditorProps {
  initialPrompts: string[];
  onConfirm: (prompts: string[]) => void;
  onCancel?: () => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ initialPrompts, onConfirm, onCancel }) => {
  const [prompts, setPrompts] = useState<string[]>(initialPrompts);

  const updatePrompt = (idx: number, val: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === idx ? val : p)));
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Review & Edit Prompts</CardTitle>
        <p className="text-sm text-muted-foreground">You can edit these now or later before generating images.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompts.map((p, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs text-muted-foreground">Prompt {i + 1}</label>
            <Textarea value={p} rows={2} onChange={(e) => updatePrompt(i, e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="button" onClick={() => onConfirm(prompts)}>Use These Prompts</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptEditor;

