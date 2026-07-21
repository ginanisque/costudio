import React, { useState } from 'react';
import WelcomeSection from '@/components/WelcomeSection';
import DesignerProfileForm from '@/components/DesignerProfileForm';
import CollectionForm from '@/components/CollectionForm';
import CollectionDisplay from '@/components/CollectionDisplay';
import CollectionNotes from '@/components/CollectionNotes';
import ImageGallery from '@/components/ImageGallery';
import ProductUploader from '@/components/ProductUploader';
import type { ProductItem } from '@/components/ProductUploader';
import CollectionGenerator from '@/components/CollectionGenerator';
import Catalogue from '@/components/Catalogue';
import SessionSidebar from '@/components/SessionSidebar';
import CollaborationPanel from '@/components/CollaborationPanel';
import FlowProgress from '@/components/FlowProgress';
import ColorTheoryTool from '@/components/ColorTheoryTool';
import ModelSelection from '@/components/ModelSelection';
import SocialMediaStrategy from '@/components/SocialMediaStrategy';
import { FabricSelection } from '@/components/FabricSelection';
import { TrendForecasting } from '@/components/TrendForecasting';
import { PortfolioExport } from '@/components/PortfolioExport';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ZipExportButton from '@/components/ZipExportButton';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateCollectionCopy, generateDesignerProfile } from '@/utils/api';
import { saveCollection, saveCollectionPersisted, saveDesigner, computeCollectionId, computeDesignerId, listDesigners, listCollections, listPalettes, listFabrics, savePalette, saveFabric, updateCollection, computePaletteId, computeFabricId, nextPieceSeq, computePieceId, savePiece, savePiecePersisted, listPiecesByCollection, updatePiece, addToInbox, addMessage, setPeerSeen, setTyping } from '@/utils/storage';
import type { ImageItem } from '@/types';
import { broadcast, getCurrentCollab } from '@/utils/collab';
import { downloadCollectionZip } from '@/utils/zip';
import { modelsCatalog } from '@/config/models';
import { toast } from '@/components/ui/use-toast';
import { continueToCosting } from '@/utils/costingHandoff';
import { getUser } from '@/utils/auth';

interface DesignerProfile {
  name: string;
  role?: string;
  background: string;
  experience: string;
  style: string;
  inspirations: string;
  education: string;
  specialties: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo?: string;
}

interface CollectionData {
  name: string;
  launchYear: string;
  inspiration: string;
  targetAge: string;
  category: string;
  customCategory: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  title?: string;
  description?: string;
  imageUrl: string;
  selected: boolean;
  improving?: boolean;
}

// --- Client-side enhancement for title/description when server copy is missing or too similar ---
function normalizeText(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tooSimilar(a: string, b: string) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // simple overlap ratio
  const setA = new Set(na.split(' '));
  const setB = new Set(nb.split(' '));
  let overlap = 0;
  setA.forEach(w => { if (setB.has(w)) overlap++; });
  const ratio = overlap / Math.max(3, Math.min(setA.size, setB.size));
  return ratio > 0.75;
}
function enhanceCollectionCopyLocal(data: CollectionData): { title: string; description: string } {
  const year = data.launchYear || String(new Date().getFullYear());
  const base = (data.inspiration || '').trim();
  const words = normalizeText(base).split(' ').filter(Boolean);
  const themes = Array.from(new Set(words.filter(w => w.length > 3))).slice(0, 5);
  const cat = data.category && data.category !== 'custom' ? data.category : (data.customCategory || 'collection');
  const moodBank = ['refined', 'modern', 'timeless', 'expressive', 'sustainable', 'editorial'];
  const verbBank = ['distills', 'celebrates', 'reimagines', 'elevates', 'explores'];
  const textureBank = ['line and movement', 'texture and proportion', 'material and light', 'structure and flow'];
  const pick = (arr: string[], i: number) => arr[i % arr.length];
  const mood = pick(moodBank, words.length);
  const verb = pick(verbBank, themes.length);
  const texture = pick(textureBank, themes.length + words.length);
  const niceThemes = themes.length ? themes.join(', ') : 'contemporary influences';
  const baseName = data.name && data.name.trim() ? data.name.trim() : `${mood.charAt(0).toUpperCase()+mood.slice(1)} ${cat}`;
  const title = `${baseName} – ${year}`;
  const opening = base
    ? `Inspired by ${niceThemes}, this ${cat} ${verb} ${texture} with a ${mood} point of view.`
    : `A ${mood} ${cat} that ${verb} ${texture} for ${year}.`;
  const details = `Silhouettes focus on ease and clarity; materials highlight tactility and polish. Designed for versatility from studio to street.`;
  return {
    title,
    description: `${opening} ${details}`,
  };
}
// Append selected trends and optional extras into description
function applyTrendsToDescription(
  desc: string,
  styles: string[] = [],
  extras: { palette?: string[]; fabrics?: { name?: string }[]; pieces?: number } = {}
) {
  const out = desc || '';
  const additions: string[] = [];
  if (extras.pieces && !/\bComprising\b/i.test(out)) {
    additions.push(`Comprising ${extras.pieces} piece${extras.pieces > 1 ? 's' : ''}.`);
  }
  if (styles && styles.length && !out.toLowerCase().includes('style highlights include')) {
    additions.push(`Style highlights include: ${styles.slice(0, 6).join(', ')}.`);
  }
  if (extras.palette && extras.palette.length && !out.toLowerCase().includes('palette colors')) {
    additions.push(`Palette colors: ${extras.palette.slice(0, 8).join(', ')}.`);
  }
  if (extras.fabrics && extras.fabrics.length && !out.toLowerCase().includes('materials focus')) {
    const names = extras.fabrics.map(f => f?.name).filter(Boolean);
    if (names.length) additions.push(`Materials focus: ${names.slice(0, 6).join(', ')}.`);
  }
  return `${out}${out && additions.length ? ' ' : ''}${additions.join(' ')}`.trim();
}
const Index = () => {
  const account = getUser();
  const businessProfileDefaults: Partial<DesignerProfile> = {
    name: account?.businessName || '',
    address: account?.businessDefaults.address || '',
    website: account?.businessDefaults.website || '',
    email: account?.businessDefaults.email || '',
    phone: account?.businessDefaults.phone || '',
    logo: account?.businessDefaults.logo || '',
  };
  const [designerProfile, setDesignerProfile] = useState<DesignerProfile | null>(null);
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [polishedBio, setPolishedBio] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [activeTab, setActiveTab] = useState('welcome');
  const [zipIncludeId, setZipIncludeId] = useState(true);
  const [openMsgs, setOpenMsgs] = useState(false);
  const [trendStyles, setTrendStyles] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('trend.styles')||'[]')||[] } catch { return [] } });
  React.useEffect(() => { try { setTrendStyles(JSON.parse(localStorage.getItem('trend.styles')||'[]')||[]) } catch { /* ignore */ } }, [activeTab]);
  // pieceCount already declared above; remove duplicate
  const [follow] = useLocalStorage<boolean>('collab.follow', false);
  const [pieceCount, setPieceCount] = useLocalStorage<number>('fashionAI.pieceCount', 8);
  const activeDesignerKey = `fashionAI.activeDesigner.${getUser()?.businessId || 'local'}`;

  React.useEffect(() => {
    try {
      const designers = listDesigners();
      if (!designers.length) return;
      const preferredId = localStorage.getItem(activeDesignerKey);
      const selected = designers.find(item => item.id === preferredId)
        || [...designers].sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''))[0];
      if (!selected?.profile) return;
      setDesignerProfile(selected.profile as unknown as DesignerProfile);
      setPolishedBio(selected.polishedProfile || '');
      localStorage.setItem(activeDesignerKey, selected.id);
    } catch { /* a profile can still be selected manually */ }
  }, [activeDesignerKey]);

  React.useEffect(() => {
    try {
      const collections = listCollections();
      if (!collections.length) return;
      const preferredId = localStorage.getItem('fashionAI.currentCollectionId');
      const selected = collections.find(item => item.id === preferredId)
        || [...collections].sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''))[0];
      if (!selected?.data) return;
      setCollection(selected.data as unknown as CollectionData);
      setGeneratedTitle(selected.title || '');
      setGeneratedDescription(selected.description || '');
      setImages(listPiecesByCollection(selected.id).map(piece => ({
        id: piece.id,
        prompt: piece.prompt,
        title: `Look ${piece.seq}`,
        description: piece.prompt,
        imageUrl: piece.imageUrl || '',
        selected: false,
      })).filter(piece => Boolean(piece.imageUrl)));
      localStorage.setItem('fashionAI.currentCollectionId', selected.id);
    } catch { /* the user can still start a new collection */ }
  }, []);
  const collectionId = collection ? computeCollectionId(collection) : '';
  const attached = React.useMemo(() => {
    if (!collection) return { palette: undefined as string[] | undefined, fabrics: [] as { name?: string }[], models: [] as typeof modelsCatalog };
    const stored = listCollections().find(c => c.id === collectionId);
    const paletteColors = stored?.paletteId ? (listPalettes().find(p => p.id === stored.paletteId)?.colors) : undefined;
    const fabrics = (stored?.fabricIds || []).map(fid => listFabrics().find(f => f.id === fid)).filter((f): f is NonNullable<typeof f> => !!f);
    const modelIds = stored?.modelIds || [];
    const models = modelsCatalog.filter(m => modelIds.includes(m.id));
    return { palette: paletteColors, fabrics, models };
  }, [collection, collectionId, activeTab]);

  const [settings, setSettings] = useLocalStorage('fashionAI.settings', {
    size: '1024x1024' as '256x256' | '512x512' | '1024x1024',
    concurrency: 2,
  });

  // Completion tracking
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>('flow.complete', {});

  React.useEffect(() => {
    const next = { ...completed } as Record<string, boolean>;
    const mark = (key: string, cond: boolean, title: string) => {
      if (cond && !next[key]) {
        next[key] = true;
        toast({ title: `${title} complete` });
      }
    };
    mark('profile', !!designerProfile, 'Profile');
    mark('collection', !!generatedTitle || !!generatedDescription, 'Collection');
    mark('generate', images.length > 0, 'Generate');
    mark('gallery', images.length > 0, 'Gallery');
    // Export marked when visiting export tab with images present
    mark('export', activeTab === 'export' && images.length > 0, 'Export');
    // Social marked when visiting social tab
    mark('social', activeTab === 'social', 'Social');
    if (JSON.stringify(next) !== JSON.stringify(completed)) setCompleted(next);
  }, [designerProfile, generatedTitle, generatedDescription, images.length, activeTab, completed, setCompleted]);

  // Broadcast navigation to collaborators
  React.useEffect(() => {
    broadcast('navigate', { tab: activeTab });
  }, [activeTab]);

  // Auto-advance to Gallery only on the first image generated
  React.useEffect(() => {
    if (images.length === 1) setActiveTab('gallery');
  }, [images.length]);

  const handleProfileSubmit = (profile: DesignerProfile) => {
    setDesignerProfile(profile);
    const designerId = computeDesignerId(profile);
    const createdAt = new Date().toISOString();
    try {
      saveDesigner({ id: designerId, profile, createdAt, name: profile.name });
      localStorage.setItem(activeDesignerKey, designerId);
    } catch { /* the in-session profile remains available */ }
    // Generate polished profile copy via AI
    generateDesignerProfile(profile)
      .then(({ profile: polished }) => {
        setPolishedBio(polished);
        try {
          saveDesigner({ id: designerId, profile, polishedProfile: polished, createdAt, name: profile.name });
        } catch { /* ignore */ }
      })
      .catch(() => {
        // Fallback: simple copy if server/AI unavailable
        const parts = [
          profile.name && `${profile.name} is a ${profile.experience || ''} fashion designer`,
          profile.style && `known for ${profile.style.toLowerCase()} aesthetics`,
          profile.background && profile.background,
          profile.inspirations && `Inspired by ${profile.inspirations.toLowerCase()}.`,
        ].filter(Boolean);
        const fallbackBio = parts.join('. ') + (parts.length ? '' : '');
        setPolishedBio(fallbackBio);
        try { saveDesigner({ id: designerId, profile, polishedProfile: fallbackBio, createdAt, name: profile.name }); } catch { /* ignore */ }
      })
      .finally(() => setActiveTab('collection'));
  };

  const generateCollectionInfo = (data: CollectionData) => {
    setCollection(data);
    // Ask AI to craft title/description
    generateCollectionCopy(data)
      .then(({ title, description }) => {
        let t = title;
        let d = description;
        if (!d || tooSimilar(d, data.inspiration || '')) {
          const local = enhanceCollectionCopyLocal(data);
          t = t || local.title;
          d = local.description;
        }
        // Integrate selected trends/palette/fabrics into description if available
        try {
          const styles = JSON.parse(localStorage.getItem('trend.styles') || '[]') as string[];
          d = applyTrendsToDescription(d, styles, { palette: attached.palette, fabrics: attached.fabrics });
        } catch { /* ignore */ }
        setGeneratedTitle(t);
        setGeneratedDescription(d);
        try {
          const id = computeCollectionId(data);
          saveCollection({ id, data, title: t, description: d, createdAt: new Date().toISOString() });
          try { localStorage.setItem('fashionAI.currentCollectionId', id); } catch { /* ignore */ }
        } catch { /* ignore */ }
      })
      .catch(() => {
        const local = enhanceCollectionCopyLocal(data);
        setGeneratedTitle(local.title);
        setGeneratedDescription(local.description);
      });
  };

  // Tone + Regenerate controls
  const [tone, setTone] = useLocalStorage<'editorial'|'press'|'minimal'>('collection.tone','editorial');
  const regenerateLocal = () => {
    if (!collection) return;
    const local = enhanceCollectionCopyLocal(collection);
    const desc = applyTrendsToDescription(local.description, trendStyles, { palette: attached.palette, fabrics: attached.fabrics });
    setGeneratedTitle(local.title);
    setGeneratedDescription(desc);
    toast({ title: 'Description regenerated', description: `Tone: ${tone}` });
  };

  // Convert ProductItems → GeneratedImage and persist pieces
  const handleProductItemsChange = (items: ProductItem[]) => {
    setImages(prev => {
      const prevMap = new Map(prev.map(i => [i.id, i]));
      return items.map(item => {
        const existing = prevMap.get(item.id);
        // Persist new items as pieces
        if (!existing) {
          const seq = nextPieceSeq();
          const collSlug = collection ? (collection.name || '') : (generatedTitle || 'collection');
          const pieceId = item.id;
          try {
            savePiece({ id: pieceId, seq, collectionId, prompt: item.description, imageUrl: item.imageUrl, createdAt: new Date().toISOString() });
          } catch { /* ignore */ }
        } else if (existing.improving !== item.improving || existing.title !== item.title || existing.description !== item.description) {
          try { updatePiece(item.id, { prompt: item.description }); } catch { /* ignore */ }
        }
        return {
          id: item.id,
          prompt: item.description,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          selected: existing?.selected ?? false,
          improving: item.improving,
        };
      });
    });
  };

  const handleGeneratedCollection = async (pieces: Array<{ prompt: string; imageUrl: string; title: string }>) => {
    const existingCollection = listCollections().find(item => item.id === collectionId);
    const collectionRecord = collection ? {
      ...existingCollection,
      id: collectionId,
      data: collection,
      title: generatedTitle || collection.name,
      description: generatedDescription || collection.inspiration,
      prompts: pieces.map(piece => piece.prompt),
      createdAt: existingCollection?.createdAt || new Date().toISOString(),
    } : null;
    const persistence: Promise<void>[] = [];
    if (collectionRecord) {
      persistence.push(saveCollectionPersisted(collectionRecord));
      try { localStorage.setItem('fashionAI.currentCollectionId', collectionId); } catch { /* ignore */ }
    }
    const created = pieces.map(piece => {
      const id = crypto.randomUUID();
      const seq = nextPieceSeq();
      persistence.push(savePiecePersisted({ id, seq, collectionId, prompt: piece.prompt, imageUrl: piece.imageUrl, createdAt: new Date().toISOString() }));
      return { id, prompt: piece.prompt, title: piece.title, description: piece.prompt, imageUrl: piece.imageUrl, selected: false };
    });
    setImages(previous => [...previous, ...created]);
    setActiveTab('gallery');
    const results = await Promise.allSettled(persistence);
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) {
      console.error('Collection persistence failures', failures);
      toast({ title: 'Images ready, but saving was incomplete', description: 'Keep this page open and try Save Collection again before leaving.', variant: 'destructive' });
    } else {
      toast({ title: 'Collection saved', description: `${created.length} generated looks are saved and ready for Export.` });
    }
  };

  const handleImageSelect = (id: string) => {
    setImages(prev => 
      prev.map(img => 
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const handleDownloadSelected = () => {
    const selectedImages = images.filter(img => img.selected);
    if (!selectedImages.length) return;
    const items = selectedImages.map(img => ({
      id: img.id,
      prompt: img.prompt,
      b64: img.imageUrl?.startsWith('data:image') ? img.imageUrl.split(',')[1] : undefined,
      url: img.imageUrl?.startsWith('http') ? img.imageUrl : undefined,
      size: settings.size,
      category: collection?.category || 'look',
    }));
    downloadCollectionZip(items, `${generatedTitle || collection?.name || 'FashionCollection'}_selected`).catch(
      err => console.error('ZIP download failed:', err),
    );
  };

  const handleContinueToCosting = () => {
    if (!collection) return;
    continueToCosting({
      id: collectionId,
      name: collection.name || generatedTitle || 'Untitled collection',
      title: generatedTitle || collection.name || 'Untitled collection',
      description: generatedDescription || collection.inspiration || '',
      category: collection.category === 'custom'
        ? (collection.customCategory || 'clothing')
        : (collection.category || 'clothing'),
      launchYear: collection.launchYear || '',
      palette: attached.palette || [],
      fabrics: attached.fabrics.map(fabric => ({
        name: fabric.name || 'Unnamed fabric',
        description: fabric.description,
      })),
      pieceCount: images.length || pieceCount,
    });
  };

  React.useEffect(() => {
    const handler = () => setOpenMsgs(true);
    window.addEventListener('open-messages', handler);
    return () => window.removeEventListener('open-messages', handler);
  }, []);

  React.useEffect(() => {
    const nav = (e: Event) => { const tab = (e as CustomEvent<{ tab: string }>).detail?.tab; if (typeof tab === 'string') setActiveTab(tab); };
    const loadDesigner = (e: Event) => { const p = (e as CustomEvent<{ profile: DesignerProfile }>).detail?.profile; if (p) { setDesignerProfile(p); setActiveTab('profile'); } };
    const loadCollection = (e: Event) => {
      const detail = (e as CustomEvent<{ data: CollectionData; title?: string; description?: string }>).detail;
      if (detail?.data) {
        setCollection(detail.data);
        setGeneratedTitle(detail.title ?? '');
        setGeneratedDescription(detail.description ?? '');
        setActiveTab('collection');
        try { localStorage.setItem('fashionAI.currentCollectionId', computeCollectionId(detail.data)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('app-navigate', nav);
    window.addEventListener('load-designer', loadDesigner);
    window.addEventListener('load-collection', loadCollection);
    return () => {
      window.removeEventListener('app-navigate', nav);
      window.removeEventListener('load-designer', loadDesigner);
      window.removeEventListener('load-collection', loadCollection);
    };
  }, []);

  return (
      <div className="max-w-6xl mx-auto space-y-8 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6">
        <aside className="lg:col-span-3 order-2 lg:order-1">
          <SessionSidebar
            designer={designerProfile}
            collection={collection}
            generatedTitle={generatedTitle}
            generatedDescription={generatedDescription}
            imagesCount={images.length}
            polishedBio={polishedBio}
            onNavigate={(tab)=> setActiveTab(tab)}
            onOpenMessages={()=> setOpenMsgs(true)}
            onSaveDesigner={() => {
              if (!designerProfile) return;
              try {
                const id = computeDesignerId(designerProfile);
                saveDesigner({ id, profile: designerProfile, polishedProfile: polishedBio || undefined, createdAt: new Date().toISOString(), name: designerProfile.name });
                localStorage.setItem(activeDesignerKey, id);
                toast({ title: 'Designer profile saved', description: 'It will be restored when you return to this workspace.' });
              } catch { /* ignore */ }
            }}
            onSaveCollection={() => {
              if (!collection) return;
              try {
                const id = computeCollectionId(collection);
                saveCollection({ id, data: collection, title: generatedTitle, description: generatedDescription, createdAt: new Date().toISOString() });
                try { localStorage.setItem('fashionAI.currentCollectionId', id); } catch { /* ignore */ }
              } catch { /* ignore */ }
            }}
            onLoadDesigner={(p, polished)=> {
              setDesignerProfile(p);
              setPolishedBio(polished || '');
              try { localStorage.setItem(activeDesignerKey, computeDesignerId(p)); } catch { /* ignore */ }
              // Jump to Profile tab so fields are editable
              setActiveTab('profile');
            }}
            onLoadCollection={(d, t, desc)=> {
              setCollection(d);
              setGeneratedTitle(t || '');
              setGeneratedDescription(desc || '');
              // Jump to Collection tab so fields are editable
              setActiveTab('collection');
              try { localStorage.setItem('fashionAI.currentCollectionId', computeCollectionId(d)); } catch { /* ignore */ }
            }}
          />
          <div className="mt-4">
            <CollaborationPanel openMessages={openMsgs} onMessagesOpenChange={setOpenMsgs} onReceive={(type, raw)=> {
              const p = raw as Record<string, unknown>;
              if (type === 'palette') {
                const name = (p?.name as string) || `Palette ${new Date().toLocaleTimeString()}`;
                const colors = (p?.colors as string[]) || [];
                if (colors.length) {
                  savePalette({ id: '', name, colors, createdAt: new Date().toISOString() });
                  toast({ title: 'Palette received', description: `${name} saved to your library` });
                }
              } else if (type === 'fabric') {
                const name = p?.name as string | undefined;
                if (name) {
                  saveFabric({ id: '', name, description: p.description as string | undefined, content: p.content as string | undefined, flow: p.flow as 'firm' | 'soft' | 'flowing' | 'stiff' | undefined, image: p.image as string | undefined, createdAt: new Date().toISOString() });
                  toast({ title: 'Fabric received', description: `${name} saved to your library` });
                }
              } else if (type === 'attach') {
                setActiveTab('collection');
              } else if (type === 'navigate') {
                if (follow && typeof p?.tab === 'string') setActiveTab(p.tab);
              } else if (type === 'catalogue') {
                const items = Array.isArray(p?.items) ? (p.items as Parameters<typeof addToInbox>[0]) : [];
                try { addToInbox(items); } catch { /* ignore */ }
                toast({ title: 'Catalogue selection shared', description: `${items.length} items` });
                setActiveTab('catalogue');
              } else if (type === 'message') {
                try {
                  const room = getCurrentCollab()?.room || 'default';
                  addMessage(room, { id: Math.random().toString(36).slice(2), author: p?.author as string | undefined, text: String(p?.text || ''), ts: (p?.ts as string) || new Date().toISOString(), self: false });
                } catch { /* ignore */ }
                if (typeof p?.text === 'string' && p.text.trim()) {
                  toast({ title: p?.author ? `Message from ${String(p.author)}` : 'New message', description: p.text.slice(0, 120) });
                }
                setOpenMsgs(true);
              } else if (type === 'message_ping') {
                setOpenMsgs(true);
              } else if (type === 'message_seen') {
                try {
                  const room = getCurrentCollab()?.room || 'default';
                  if (p?.author && p?.ts) setPeerSeen(room, String(p.author), String(p.ts));
                } catch { /* ignore */ }
              } else if (type === 'typing') {
                try {
                  const room = getCurrentCollab()?.room || 'default';
                  if (p?.author) setTyping(room, String(p.author), 2500);
                } catch { /* ignore */ }
              }
            }} />
          </div>
        </aside>
        <div className="lg:col-span-9 order-1 lg:order-2 space-y-8">
          <FlowProgress
            current={activeTab}
            onNavigate={setActiveTab}
            steps={[
              { key: 'profile', label: 'Profile' },
              { key: 'collection', label: 'Collection' },
              { key: 'generate', label: 'Generate' },
              { key: 'export', label: 'Export' },
              { key: 'social', label: 'Social' },
            ]}
            completed={Object.keys(completed).filter(k => completed[k])}
            onReset={() => { setCompleted({}); toast({ title: 'Flow reset' }); setActiveTab('profile'); }}
          />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          <TabsContent value="welcome">
            <WelcomeSection />
            <div className="text-center mt-8">
              <Button onClick={() => setActiveTab('profile')} size="lg">
                Start New Collection
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <DesignerProfileForm initialProfile={{ ...businessProfileDefaults, ...(designerProfile || {}), address: businessProfileDefaults.address, website: businessProfileDefaults.website, email: businessProfileDefaults.email, phone: businessProfileDefaults.phone, logo: businessProfileDefaults.logo }} onSubmit={handleProfileSubmit} />
            {polishedBio && (
              <Card className="mt-6 max-w-3xl">
                <CardHeader>
                  <CardTitle>Press Bio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed whitespace-pre-wrap">{polishedBio}</p>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setActiveTab('welcome')}>Back: Welcome</Button>
              <Button variant="default" onClick={() => setActiveTab('collection')}>Next: Collection</Button>
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <CollectionForm initialData={collection || undefined} onSubmit={generateCollectionInfo} />
            {collection && (
              <CollectionDisplay 
                collection={collection}
                generatedTitle={generatedTitle}
                generatedDescription={generatedDescription}
                attachedPaletteColors={attached.palette}
                attachedFabrics={attached.fabrics}
                attachedModels={attached.models}
              />
            )}
            {collection && (
              <CollectionNotes collectionId={computeCollectionId(collection)} />
            )}
            {collection && (
              <div className="flex items-center justify-between border rounded p-3 bg-muted/20">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Tone</span>
                  <select aria-label="Description tone" className="border rounded px-2 py-1 text-sm" value={tone} onChange={(e)=> setTone(e.target.value as 'editorial' | 'press' | 'minimal')}>
                    <option value="editorial">Editorial</option>
                    <option value="press">Press Release</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={regenerateLocal}>Regenerate Description</Button>
                </div>
              </div>
            )}
            {collection && trendStyles.length > 0 && (
              <div className="border rounded p-3">
                <div className="text-sm font-medium mb-2">Trend Styles</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {trendStyles.map((s,i)=> (
                    <label key={i} className="inline-flex items-center gap-1 border rounded px-2 py-1 text-xs">
                      <input type="checkbox" checked onChange={(e)=> { if (!e.target.checked) setTrendStyles(prev => prev.filter(x => x !== s)); }} /> {s}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={()=> { try { localStorage.removeItem('trend.styles'); } catch { /* ignore */ }; setTrendStyles([]); }}>Clear</Button>
                  <Button size="sm" onClick={()=> {
                    const sel = trendStyles;
                    if (!sel.length) return;
                    const extra = ` Style highlights include: ${sel.slice(0,6).join(', ')}.`;
                    setGeneratedDescription((d)=> (d||'') + extra);
                    toast({ title: 'Styles applied to description' });
                  }}>Apply to Description</Button>
                </div>
              </div>
            )}
            {collection && (
              <div className="flex justify-start">
                <Button variant="outline" onClick={()=> setActiveTab('profile')}>Back: Profile</Button>
              </div>
            )}
            {collection && (generatedTitle || generatedDescription) && (
              <div className="sticky bottom-0 z-10 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=> {
                    try {
                      const id = computeCollectionId(collection);
                      saveCollection({ id, data: collection, title: generatedTitle, description: generatedDescription, createdAt: new Date().toISOString() });
                      try { localStorage.setItem('fashionAI.currentCollectionId', id); } catch { /* ignore */ }
                      toast({ title: 'Collection saved' });
                    } catch { /* ignore */ }
                  }}>Save</Button>
                  <Button variant="default" onClick={()=> setActiveTab('trends')}>Next: Trends</Button>
                </div>
              </div>
            )}
            {collection && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleContinueToCosting}>
                  Continue to Costing Studio
                </Button>
                {attached.palette && attached.palette.length > 0 && (
                  <Button variant="outline" onClick={()=> broadcast('palette', { name: generatedTitle || collection.name || 'Collection Palette', colors: attached.palette! })}>
                    Share Attached Palette
                  </Button>
                )}
                {attached.fabrics && attached.fabrics.length > 0 && (
                  <Button variant="outline" onClick={()=> attached.fabrics.forEach(f => broadcast('fabric', f))}>
                    Share Attached Fabrics
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="colors">
            <ColorTheoryTool />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setActiveTab('trends')}>Back: Trends</Button>
              <Button variant="default" onClick={() => setActiveTab('models')}>Next: Models</Button>
            </div>
          </TabsContent>

          <TabsContent value="models">
            <ModelSelection />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setActiveTab('colors')}>Back: Colors</Button>
              <Button variant="default" onClick={() => setActiveTab('fabrics')}>Next: Fabrics</Button>
            </div>
          </TabsContent>
          <TabsContent value="fabrics">
            <FabricSelection />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setActiveTab('models')}>Back: Models</Button>
              <Button variant="default" onClick={() => setActiveTab('generate')}>Next: Generate</Button>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <TrendForecasting />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setActiveTab('collection')}>Back: Collection</Button>
              <Button variant="default" onClick={() => setActiveTab('colors')}>Next: Colors</Button>
            </div>
          </TabsContent>

          <TabsContent value="generate">
            <div className="space-y-6">
              <CollectionGenerator
                initialDescription={[
                  generatedDescription || collection?.inspiration || '',
                  designerProfile ? `Designer identity: ${designerProfile.style || ''}. Inspirations: ${designerProfile.inspirations || ''}. Specialties: ${designerProfile.specialties || ''}.` : '',
                ].filter(Boolean).join('\n\n')}
                pieceCount={pieceCount}
                onPieceCountChange={setPieceCount}
                palette={attached.palette || []}
                fabrics={attached.fabrics}
                models={attached.models}
                size={settings.size}
                onGenerated={handleGeneratedCollection}
              />
              <div className="flex items-center gap-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or add existing product photography<span className="h-px flex-1 bg-border" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Upload Product Images</h2>
                <p className="text-sm text-muted-foreground">
                  Add your product photos, then give each piece a title and description. Use <strong>Improve with AI</strong> to polish the copy.
                </p>
              </div>
              <ProductUploader
                collectionName={generatedTitle || collection?.name}
                collectionInspiration={collection?.inspiration}
                items={images.map<ProductItem>(img => ({
                  id: img.id,
                  title: img.title ?? '',
                  description: img.description ?? img.prompt,
                  imageUrl: img.imageUrl,
                  improving: img.improving,
                }))}
                onItemsChange={handleProductItemsChange}
              />
              {images.length > 0 && (
                <div className="sticky bottom-0 z-10 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground mr-2">{images.length} product{images.length !== 1 ? 's' : ''} added</span>
                    <Button variant="default" onClick={() => setActiveTab('gallery')}>View Gallery →</Button>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab('fabrics')}>Back: Fabrics</Button>
                <Button variant="default" onClick={() => setActiveTab('gallery')}>Next: Gallery</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Your Gallery</h3>
              {images.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input id="zipIncId" type="checkbox" checked={zipIncludeId} onChange={(e)=> setZipIncludeId(e.target.checked)} />
                    <label htmlFor="zipIncId">Include ID in filenames</label>
                  </div>
                  <ZipExportButton
                    includeIdInFilename={zipIncludeId}
                    items={images.map<ImageItem>((img, idx) => ({
                      id: img.id,
                      prompt: img.prompt,
                      b64: img.imageUrl?.startsWith('data:image') ? img.imageUrl.split(',')[1] : undefined,
                      url: img.imageUrl?.startsWith('http') ? img.imageUrl : undefined,
                      size: settings.size,
                      fileName: undefined,
                      category: collection?.category || 'look',
                    }))}
                    collectionTitle={generatedTitle || collection?.name || 'FashionCollection'}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mb-2">
              <Button variant="outline" onClick={()=> setActiveTab('generate')}>Back: Upload</Button>
              {images.length > 0 && (
                <Button variant="default" onClick={()=> setActiveTab('export')}>Next: Export</Button>
              )}
            </div>
            <ImageGallery 
              images={images}
              onImageSelect={handleImageSelect}
              onDownloadSelected={handleDownloadSelected}
              onUpdateImage={(id, update) => {
                setImages(prev => prev.map(img => {
                  if (img.id !== id) return img;
                  const next = { ...img, ...update } as GeneratedImage;
                  // Keep description and prompt in sync
                  if (update.description !== undefined) next.prompt = update.description;
                  try { updatePiece(id, { prompt: next.prompt }); } catch { /* ignore */ }
                  return next;
                }));
              }}
            />
          </TabsContent>

          <TabsContent value="catalogue">
            <Catalogue />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={()=> setActiveTab('gallery')}>Back: Gallery</Button>
              <Button variant="default" onClick={()=> setActiveTab('export')}>Next: Export</Button>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <SocialMediaStrategy />
            <div className="flex justify-start mt-4">
              <Button variant="outline" onClick={()=> setActiveTab('export')}>Back: Export</Button>
            </div>
          </TabsContent>

          <TabsContent value="export">
            <div className="flex justify-between mb-4">
              <Button variant="outline" onClick={()=> setActiveTab('gallery')}>Back: Gallery</Button>
              <Button variant="outline" onClick={()=> setActiveTab('social')}>Next: Social</Button>
            </div>
            <PortfolioExport 
              images={images.filter(i=> !!i.imageUrl).map(i=> ({ src: i.imageUrl, caption: i.prompt, id: i.id }))}
              currentCollectionId={collectionId}
              designer={{ 
                name: designerProfile?.name, 
                bio: polishedBio,
                address: account?.businessDefaults.address,
                website: account?.businessDefaults.website,
                email: account?.businessDefaults.email,
                phone: account?.businessDefaults.phone,
                instagram: designerProfile?.instagram,
                twitter: designerProfile?.twitter,
                tiktok: designerProfile?.tiktok,
              }}
            />
          </TabsContent>
        </Tabs>
        </div>
      </div>
  );
};

export default Index;
