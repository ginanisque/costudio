import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { listCollections, listPalettes, listFabrics, listPromptSets, listNotesByCollection } from '@/utils/storage';
import { generateSocialPack } from '@/utils/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export type ExportImage = { src: string; caption?: string; description?: string; price?: string; id?: string };

const escapeHtml = (value?: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const publicLookDescription = (value?: string) => {
  const cleaned = String(value || '')
    .replace(/^(?:full[- ]length\s+)?(?:(?:high[- ]fashion|commercial|editorial)\s+)*(?:fashion\s+)?(?:portrait|image|campaign image|photograph)\s+of\s+[^,.]+?\s+(?:wearing|in)\s+/i, '')
    .replace(/\b(?:use|using|preserve|match)\b[^.]{0,180}\b(?:reference image|identity|model reference)\b[^.]*\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
};

type DesignerInfo = { name?: string; role?: string; bio?: string; address?: string; website?: string; email?: string; phone?: string; instagram?: string; twitter?: string; tiktok?: string; logo?: string };

export const PortfolioExport: React.FC<{ images?: ExportImage[]; designer?: DesignerInfo; currentCollectionId?: string }> = ({ images = [], designer, currentCollectionId }) => {
  const [portfolioData, setPortfolioData] = useState({
    title: '',
    description: '',
    format: 'pdf',
    layout: 'modern',
    includeSpecs: true,
    includePricing: false
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [collections, setCollections] = useState(() => listCollections());
  useEffect(() => {
    const refreshed = listCollections();
    setCollections(refreshed);
    if (currentCollectionId && refreshed.some(collection => collection.id === currentCollectionId)) {
      setSelected(previous => ({ ...previous, [currentCollectionId]: true }));
    }
  }, [currentCollectionId, images.length]);
  const selectedCollections = useMemo(() => collections.filter(c => selected[c.id]), [collections, selected]);
  const [includeImages, setIncludeImages] = useState(true);
  const [layoutByCollection, setLayoutByCollection] = useState<Record<string, 'grid' | 'hero'>>({});
  const [brandLogo, setBrandLogo] = useState<string>(designer?.logo || '');
  const [captionTemplate, setCaptionTemplate] = useState<string>('{index}. {caption}\n{description}\n{price}');
  const [social, setSocial] = useState<{ headline?: string; press_blurb?: string; tweet?: string; instagram?: { caption?: string; hashtags?: string[] } } | null>(null);
  const [cardLogo, setCardLogo] = useState<string>(designer?.logo || '');
  React.useEffect(()=> {
    const workspaceLogo = designer?.logo || '';
    setBrandLogo(workspaceLogo);
    setCardLogo(workspaceLogo);
  }, [designer?.logo]);
  const wmIds = false;
  
  // --- Business Card helpers ---
  const makeUrl = (u?: string) => {
    if (!u) return '';
    const s = u.trim();
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('mailto:')) return s;
    if (s.includes('.') && !s.startsWith('@')) return `https://${s}`;
    return s;
  };
  const handleLink = (platform: 'instagram'|'twitter'|'tiktok', handle?: string) => {
    if (!handle) return '';
    const h = handle.trim().replace(/^@+/, '');
    if (!h) return '';
    if (platform === 'instagram') return `https://instagram.com/${h}`;
    if (platform === 'twitter') return `https://twitter.com/${h}`;
    return `https://tiktok.com/@${h}`;
  };

  const downloadBusinessCardPng = async () => {
    const name = designer?.name || 'Designer Name';
    const role = designer?.role || 'Fashion Designer';
    const email = designer?.email || '';
    const phone = designer?.phone || '';
    const website = designer?.website || '';
    const ig = designer?.instagram || '';
    const width = 1050, height = 600; // 3.5in x 2in @ 300dpi
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,width,height);
    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.strokeRect(8,8,width-16,height-16);
    // Optional logo (top-right)
    let rightPad = 0;
    if (cardLogo) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 280, maxH = 140;
          let w = img.width, h = img.height;
          const scale = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * scale); h = Math.round(h * scale);
          ctx.drawImage(img, width - w - 36, 28, w, h);
          rightPad = Math.max(rightPad, w + 40);
          resolve();
        };
        img.src = cardLogo;
      });
    }
    // Name
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 72px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(name, 40, 160);
    // Role
    ctx.fillStyle = '#6b7280';
    ctx.font = '36px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(role, 40, 210);
    // Contacts
    ctx.fillStyle = '#111827';
    ctx.font = '30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    let y = 280;
    const line = (label: string, val?: string) => {
      if (!val) return;
      ctx.fillText(`${label}: ${val}`, 40, y);
      y += 48;
    };
    line('Email', email);
    line('Phone', phone);
    line('Web', website);
    line('IG', ig);
    // QR code (website)
    const qrUrl = website ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(makeUrl(website))}` : '';
    if (qrUrl) {
      await new Promise<void>((resolve) => {
        const qr = new Image();
        qr.crossOrigin = 'anonymous';
        qr.onload = () => { ctx.drawImage(qr, width - 220, height - 220, 180, 180); resolve(); };
        qr.onerror = () => resolve();
        qr.src = qrUrl;
      });
    }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'business-card').replace(/[^a-z0-9\-_.]+/gi,'_')}_card.png`;
    a.click();
  };

  const printBusinessCard = () => {
    const name = designer?.name || 'Designer Name';
    const role = designer?.role || 'Fashion Designer';
    const email = designer?.email || '';
    const phone = designer?.phone || '';
    const website = designer?.website || '';
    const ig = designer?.instagram || '';
    const win = window.open('', '_blank');
    if (!win) return;
    const css = `
      @page { size: 3.5in 2in; margin: 0; }
      html, body { height: 100%; }
      body { margin: 0; display:flex; align-items:center; justify-content:center; background: #f3f4f6; }
      .card { width: 3.5in; height: 2in; background:#fff; box-sizing:border-box; padding: 0.18in 0.20in; border: 2px solid #e5e7eb; display:flex; flex-direction:column; justify-content:center; position: relative; }
      .name { font: 700 18pt system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111827; }
      .role { font: 400 10.5pt system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#6b7280; margin-top: 2pt; }
      .line { font: 400 10pt system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111827; }
      .sp { height: 6pt; }
      a { color: #111827; text-decoration: none; }
      .logo { position:absolute; top: 10pt; right: 10pt; max-width: 70pt; max-height: 30pt; }
      .qr { position:absolute; right: 10pt; bottom: 10pt; width: 48pt; height: 48pt; }
    `;
    const qrUrl = website ? `https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(makeUrl(website))}` : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${name} – Business Card</title><style>${css}</style></head><body>
      <div class="card">
        ${cardLogo ? `<img class="logo" src="${cardLogo}"/>` : ''}
        <div class="name">${name}</div>
        <div class="role">${role}</div>
        <div class="sp"></div>
        ${email ? `<div class="line">Email: <a href="mailto:${email}">${email}</a></div>` : ''}
        ${phone ? `<div class="line">Phone: ${phone}</div>` : ''}
        ${website ? `<div class="line">Web: <a href="${makeUrl(website)}" target="_blank">${website}</a></div>` : ''}
        ${ig ? `<div class="line">IG: <a href="${handleLink('instagram', ig)}" target="_blank">${ig}</a></div>` : ''}
        ${qrUrl ? `<img class="qr" src="${qrUrl}"/>` : ''}
      </div>
    </body></html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };
  // Prefill from current collection if present
  useEffect(() => {
    try {
      const currentId = localStorage.getItem('fashionAI.currentCollectionId');
      if (currentId && collections.some(c => c.id === currentId)) {
        setSelected(prev => ({ ...prev, [currentId]: true }));
      }
    } catch { /* ignore */ }
  }, [collections.length]);

  // When exactly one collection is selected, prefill title/description if empty
  useEffect(() => {
    if (selectedCollections.length === 1) {
      const c = selectedCollections[0];
      setPortfolioData(d => ({
        ...d,
        title: d.title || c.title || c.data?.name || '',
        description: d.description || c.description || c.data?.inspiration || '',
      }));
    }
  }, [selectedCollections.map(c=>c.id).join(',')]);

  const exportFormats = [
    { value: 'pdf', label: 'PDF Portfolio', description: 'Professional print-ready format' },
    { value: 'web', label: 'Web Gallery', description: 'Interactive online showcase' },
    { value: 'presentation', label: 'Presentation', description: 'Slideshow format for pitches' },
    { value: 'lookbook', label: 'Digital Lookbook', description: 'Magazine-style layout' }
  ];

  const layoutStyles = [
    { value: 'modern', label: 'Modern Minimalist' },
    { value: 'classic', label: 'Classic Editorial' },
    { value: 'creative', label: 'Creative Artistic' },
    { value: 'luxury', label: 'Luxury Brand' }
  ];

  const handleExport = async () => {
    const coll = selectedCollections;
    if (coll.length === 0) {
      alert('Select at least one collection to export');
      return;
    }
    // Build manifest
    const palettes = listPalettes();
    const fabrics = listFabrics();
    const promptSets = listPromptSets();
    const exportedImages = includeImages ? images.map((image, index) => ({
      id: image.id || `look-${index + 1}`,
      caption: image.caption || '',
      description: publicLookDescription(image.description),
      price: image.price || '',
      file: `images/look-${String(index + 1).padStart(2, '0')}.png`,
      src: image.src,
    })) : [];

    const manifest = {
      portfolio: {
        title: portfolioData.title || coll[0].title || coll[0].data?.name || 'Untitled Portfolio',
        description: portfolioData.description || coll[0].description || coll[0].data?.inspiration || '',
        format: portfolioData.format,
        layout: portfolioData.layout,
        generatedAt: new Date().toISOString(),
      },
      designer: designer ? { 
        name: designer.name || '', 
        bio: designer.bio || '',
        address: designer.address || '',
        website: designer.website || '',
        email: designer.email || '',
        phone: designer.phone || '',
        instagram: designer.instagram || '',
        twitter: designer.twitter || '',
        tiktok: designer.tiktok || '',
      } : null,
      images: exportedImages.map(({ id, caption, description, price, file }) => ({ id, caption, description, price, file })),
      collections: coll.map((c) => {
        const pal = c.paletteId ? palettes.find(p => p.id === c.paletteId) : undefined;
        const fabs = (c.fabricIds || []).map(fid => fabrics.find(f => f.id === fid)).filter(Boolean);
        const prompts = c.promptSetId ? (promptSets.find(ps => ps.id === c.promptSetId)?.items || []) : (c.prompts || []);
        const notes = listNotesByCollection(c.id).map(n => ({ id: n.id, title: n.title, body: n.body, updatedAt: n.updatedAt || n.createdAt }));
        return {
          id: c.id,
          title: c.title || c.data?.name || '',
          description: c.description || c.data?.inspiration || '',
          meta: {
            launchYear: c.data?.launchYear || '',
            category: c.data?.category || c.data?.customCategory || '',
            targetAge: c.data?.targetAge || '',
          },
          palette: pal ? { id: pal.id, name: pal.name, colors: pal.colors } : null,
          fabrics: fabs.map(f => ({ id: f!.id, name: f!.name, content: f!.content, flow: f!.flow })),
          prompts,
          notes,
        };
      }),
    };

    // Create CSV helpers
    function csvRow(vals: (string|number|null|undefined)[]) {
      return vals.map(v => {
        const s = (v ?? '').toString();
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }
    const collectionsCsvHeader = csvRow(['id','title','description','launchYear','category','targetAge','fabricCount','paletteColors','promptsCount']);
    const collectionsCsv = [
      collectionsCsvHeader,
      ...manifest.collections.map(c => csvRow([
        c.id, c.title, c.description, c.meta.launchYear, c.meta.category, c.meta.targetAge,
        c.fabrics.length, c.palette ? c.palette.colors.length : 0, c.prompts.length,
      ])),
    ].join('\n');

    // Build printable HTML catalogue
    const css = `@page { size:A4 portrait; margin:10mm; } * { box-sizing:border-box; } html,body { margin:0; padding:0; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; font-family:system-ui,sans-serif; font-size:10pt; color:#1f2937; } h1,h2,h3,p { margin-top:0; } h1 { font-size:24pt; margin-bottom:5mm; } h2 { font-size:18pt; margin-bottom:3mm; } .intro { position:relative; border-bottom:1px solid #d1d5db; padding:0 32mm 6mm 0; margin-bottom:7mm; break-inside:avoid; page-break-inside:avoid; } .collection { margin:0 0 8mm; } .collection-head { border-left:3px solid #0f766e; padding:2mm 0 2mm 4mm; margin-bottom:5mm; break-inside:avoid; page-break-inside:avoid; } .palette { display:flex; gap:2mm; margin:3mm 0; } .sw { width:5mm; height:5mm; border:1px solid #999; border-radius:2px; } .section { margin:3mm 0; } .looks { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6mm 5mm; align-items:start; } .look { min-width:0; break-inside:avoid; page-break-inside:avoid; } .look .img { display:block; width:100%; height:91mm; object-fit:contain; background:#f8fafc; border-radius:4px; } .caption { font-size:9pt; line-height:1.35; color:#4b5563; margin-top:2mm; white-space:pre-line; } .meta { font-size:10pt; line-height:1.45; color:#4b5563; white-space:pre-line; } .chip { display:inline-block; border:1px solid #ccc; padding:1mm 2mm; border-radius:12px; font-size:9pt; margin:0 1mm 1mm 0; } .hero { position:relative; height:245mm; break-after:page; page-break-after:always; } .hero .img { width:100%; height:100%; object-fit:contain; } .hero-title { position:absolute; bottom:12px; left:12px; background:rgba(255,255,255,.84); padding:6px 10px; border-radius:8px; font-weight:600; } .logo { position:absolute; top:0; right:0; max-width:28mm; max-height:16mm; }`;
    const renderCaption = (img: ExportImage, i: number, collectionTitle: string) => {
      const ctx: Record<string,string> = {
        index: String(i + 1),
        caption: img.caption || '',
        description: publicLookDescription(img.description),
        price: img.price || '',
        collection: collectionTitle,
        portfolio: manifest.portfolio.title,
      };
      return escapeHtml(captionTemplate.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? ''));
    };
    const htmlParts: string[] = [`<html><head><meta charset="utf-8"/><title>${manifest.portfolio.title}</title><style>${css}</style></head><body>`];
    htmlParts.push(`<header class="intro"><h1>${escapeHtml(manifest.portfolio.title)}</h1><div class="meta">${escapeHtml(manifest.portfolio.description)}</div>${brandLogo ? `<img class="logo" src="${brandLogo}"/>` : ''}</header>`);
    selectedCollections.forEach((c) => {
      const pal = c.paletteId ? palettes.find(p=>p.id===c.paletteId) : undefined;
      const fabs = (c.fabricIds||[]).map(fid=> fabrics.find(f=> f?.id===fid)).filter((f): f is NonNullable<typeof f> => !!f);
      const layout = layoutByCollection[c.id] || 'grid';
      if (layout === 'hero' && includeImages && images.length>0) {
        const hero = images[0];
        htmlParts.push(`<div class="hero"><img class="img" src="${hero.src}"/><div class="hero-title">${escapeHtml(c.title || c.data?.name || '')}</div></div>`);
      }
      htmlParts.push(`<section class="collection"><header class="collection-head"><h2>${escapeHtml(c.title || c.data?.name || '')}</h2><div class="meta">${escapeHtml(c.description || c.data?.inspiration || '')}</div>`);
      if (pal) htmlParts.push(`<div class="section"><div class="palette">${pal.colors.slice(0,18).map(col=>`<span class="sw" style="background:${col}"></span>`).join('')}</div></div>`);
      if (fabs.length>0) htmlParts.push(`<div class="section">${fabs.map(f=>`<span class="chip">${escapeHtml(f.name)}</span>`).join(' ')}</div>`);
      htmlParts.push(`</header>`);
      if (includeImages && images.length>0) {
        htmlParts.push(`<div class="looks">${images.map((img,index)=>`<article class="look"><img class="img" src="${img.src}"/><div class="caption">${renderCaption(img, index, c.title || c.data?.name || '')}</div></article>`).join('')}</div>`);
      }
      htmlParts.push(`</section>`);
    });
    htmlParts.push(`</body></html>`);
    const catalogueHtml = htmlParts.join('');

    // Package ZIP
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('collections.csv', collectionsCsv);
    for (const image of exportedImages) {
      if (image.src.startsWith('data:image')) {
        const comma = image.src.indexOf(',');
        if (comma >= 0) zip.file(image.file, image.src.slice(comma + 1), { base64: true });
      } else if (image.src.startsWith('http')) {
        try {
          const response = await fetch(image.src);
          if (response.ok) zip.file(image.file, await response.blob());
        } catch { /* the catalogue still retains the source URL */ }
      }
    }
    // per-collection CSVs
    manifest.collections.forEach((c) => {
      const base = c.title || c.id;
      const safe = base.replace(/[^a-z0-9\-_.]+/gi, '_').slice(0,80);
      const fabricsCsv = [csvRow(['id','name','content','flow']), ...c.fabrics.map(f => csvRow([f.id, f.name, f.content, f.flow]))].join('\n');
      const promptsCsv = [csvRow(['prompt']), ...c.prompts.map(p => csvRow([p]))].join('\n');
      if (c.palette) zip.file(`${safe}/palette.json`, JSON.stringify(c.palette, null, 2));
      zip.file(`${safe}/fabrics.csv`, fabricsCsv);
      zip.file(`${safe}/prompts.csv`, promptsCsv);
    });

    zip.file('catalogue.html', catalogueHtml);
    if (social) {
      zip.file('social.json', JSON.stringify(social, null, 2));
      const txt = `Headline:\n${social.headline}\n\nPress Blurb:\n${social.press_blurb}\n\nTweet:\n${social.tweet}\n\nInstagram Caption:\n${social.instagram?.caption}\n\nHashtags:\n${(social.instagram?.hashtags||[]).join(' ')}`;
      zip.file('social.txt', txt);
    }
    if (brandLogo && brandLogo.startsWith('data:')) {
      try {
        const base64 = brandLogo.split(',')[1];
        zip.file('assets/logo.png', base64, { base64: true });
      } catch { /* ignore */ }
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const stamp = new Date().toISOString().replace(/[:T]/g,'-').slice(0,16);
    saveAs(blob, `${manifest.portfolio.title.replace(/[^a-z0-9\-_.]+/gi,'_')}_${stamp}.zip`);
  };

  const openPrintCatalogue = () => {
    if (selectedCollections.length === 0) {
      alert('Select at least one collection');
      return;
    }
    const pal = listPalettes();
    const fabs = listFabrics();
    const win = window.open('', '_blank');
    if (!win) return;
    const title = portfolioData.title || selectedCollections[0].title || selectedCollections[0].data?.name || 'Catalogue';
    const css = `
      @page { size: A4 portrait; margin: 10mm; }
      * { box-sizing:border-box; }
      html, body { margin:0; padding:0; }
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; font-family:system-ui,sans-serif; font-size:10pt; color:#1f2937; }
      h1,h2,h3,p { margin-top:0; }
      h1 { font-size:24pt; margin-bottom:5mm; }
      h2 { font-size:18pt; margin-bottom:3mm; }
      .intro { position:relative; border-bottom:1px solid #d1d5db; padding:0 32mm 6mm 0; margin-bottom:6mm; break-inside:avoid; page-break-inside:avoid; }
      .designer { background:#f8fafc; padding:4mm; margin-bottom:7mm; border-radius:4px; break-inside:avoid; page-break-inside:avoid; }
      .collection { margin:0 0 8mm; }
      .collection-head { border-left:3px solid #0f766e; padding:2mm 0 2mm 4mm; margin-bottom:5mm; break-inside:avoid; page-break-inside:avoid; }
      .palette { display:flex; gap:2mm; margin:3mm 0; }
      .sw { width:5mm; height:5mm; border:1px solid #999; border-radius:2px; }
      .section { margin:3mm 0; }
      .looks { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6mm 5mm; align-items:start; }
      .look { min-width:0; break-inside:avoid; page-break-inside:avoid; }
      .look .img { display:block; width:100%; height:91mm; object-fit:contain; background:#f8fafc; border-radius:4px; }
      .caption { font-size:9pt; line-height:1.35; color:#4b5563; margin-top:2mm; white-space:pre-line; }
      .meta { font-size:10pt; line-height:1.45; color:#4b5563; white-space:pre-line; }
      .chip { display:inline-block; border:1px solid #ccc; padding:1mm 2mm; border-radius:12px; font-size:9pt; margin:0 1mm 1mm 0; }
      .hero { position:relative; height:245mm; break-after:page; page-break-after:always; }
      .hero .img { width:100%; height:100%; object-fit:contain; }
      .hero-title { position:absolute; bottom:12px; left:12px; background: rgba(255,255,255,.8); padding:6px 10px; border-radius:8px; font-weight:600; }
      .logo { position:absolute; top:0; right:0; max-width:28mm; max-height:16mm; }
    `;
    const html = [`<html><head><title>${title}</title><style>${css}</style></head><body>`];
    html.push(`<header class="intro"><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(portfolioData.description)}</div>${brandLogo ? `<img class="logo" src="${brandLogo}"/>` : ''}</header>`);
    if (designer?.name || designer?.bio || designer?.website || designer?.email || designer?.phone || designer?.address || designer?.instagram || designer?.twitter || designer?.tiktok) {
      const link = (url: string, label?: string) => `<a href="${url}" target="_blank" rel="noopener">${label || url}</a>`;
      const handleUrl = (platform: 'instagram'|'twitter'|'tiktok', handle?: string) => {
        if (!handle) return '';
        const h = handle.trim().replace(/^@+/, '');
        if (!h) return '';
        if (platform === 'instagram') return `https://instagram.com/${h}`;
        if (platform === 'twitter') return `https://twitter.com/${h}`;
        return `https://tiktok.com/@${h}`;
      };
      const contacts = [
        designer?.website ? `<div><strong>Website:</strong> ${link(designer.website)}</div>` : '',
        designer?.email ? `<div><strong>Email:</strong> <a href="mailto:${designer.email}">${designer.email}</a></div>` : '',
        designer?.instagram ? `<div><strong>Instagram:</strong> ${link(handleUrl('instagram', designer.instagram), designer.instagram)}</div>` : '',
        designer?.twitter ? `<div><strong>Twitter/X:</strong> ${link(handleUrl('twitter', designer.twitter), designer.twitter)}</div>` : '',
        designer?.tiktok ? `<div><strong>TikTok:</strong> ${link(handleUrl('tiktok', designer.tiktok), designer.tiktok)}</div>` : '',
        designer?.phone ? `<div><strong>Phone:</strong> ${designer.phone}</div>` : '',
        designer?.address ? `<div style="white-space:pre-wrap"><strong>Address:</strong> ${designer.address.replace(/</g,'&lt;')}</div>` : '',
      ].filter(Boolean).join('');
      html.push(`<section class="designer"><h2>Designer</h2>` +
        `${designer?.name ? `<div class="meta"><strong>${escapeHtml(designer.name)}</strong></div>` : ''}` +
        `${designer?.bio ? `<div style="margin-top:8px; white-space:pre-wrap; line-height:1.5">${(designer.bio || '').replace(/</g,'&lt;')}</div>` : ''}` +
        `${contacts ? `<div style="margin-top:10px" class="meta">${contacts}</div>` : ''}` +
      `</section>`);
    }

    // Business card (PNG download) and print handled elsewhere via buttons; HTML here only prints portfolio.
    const renderCaption = (img: ExportImage, i: number, collectionTitle: string) => {
      const ctx: Record<string,string> = {
        index: String(i + 1),
        caption: img.caption || '',
        description: publicLookDescription(img.description),
        price: img.price || '',
        collection: collectionTitle,
        portfolio: title,
        id: img.id || '',
      };
      return escapeHtml(captionTemplate.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? ''));
    };
    selectedCollections.forEach((c) => {
      const palette = c.paletteId ? pal.find(p=>p.id===c.paletteId) : undefined;
      const fabrics = (c.fabricIds||[]).map(fid=> fabs.find(f=> f.id===fid)).filter(Boolean);
      const layout = layoutByCollection[c.id] || 'grid';
      // Optional cover/hero page
      if (layout === 'hero' && includeImages && images.length>0) {
        const hero = images[0];
        html.push(`<div class="hero">`+
          `<img class="img" src="${hero.src}"/>`+
          `<div class="hero-title">${escapeHtml(c.title || c.data?.name || '')}</div>`+
          `</div>`);
      }
      html.push(`<section class="collection"><header class="collection-head"><h2>${escapeHtml(c.title || c.data?.name || '')}</h2><div class="meta">${escapeHtml(c.description || c.data?.inspiration || '')}</div>`);
      if (palette) {
        html.push(`<div class="section"><div class="palette">` + palette.colors.slice(0,18).map(col=>`<span class="sw" style="background:${col}"></span>`).join('') + `</div></div>`);
      }
      if (fabrics.length>0) {
        html.push(`<div class="section">`+ fabrics.map(f=> `<span class="chip">${escapeHtml(f!.name)}</span>`).join(' ') + `</div>`);
      }
      // Notes section
      const notes = listNotesByCollection(c.id);
      if (notes.length > 0) {
        html.push(`<div class="section"><h3 style="margin:0 0 6px 0;">Notes</h3>` +
          notes.slice(0, 8).map(n => `<div style="font-size:12px;margin:4px 0;"><strong>${(n.title||'Untitled').toString().replace(/</g,'&lt;')}</strong><div style="white-space:pre-wrap;">${(n.body||'').toString().replace(/</g,'&lt;')}</div></div>`).join('') +
        `</div>`);
      }
      html.push(`</header>`);
      if (includeImages && images.length>0) {
        html.push(`<div class="looks">`+ images.map((img,index)=> `<article class="look" style="position:relative"><img class="img" src="${img.src}"/><div class="caption">${renderCaption(img, index, c.title || c.data?.name || '')}</div></article>`).join('') + `</div>`);
      }
      html.push(`</section>`);
    });
    html.push(`</body></html>`);
    win.document.open();
    win.document.write(html.join(''));
    win.document.close();
    win.focus();
    setTimeout(()=> win.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/68a41d11e6455860844247ce_1756137378134_566efe4d.webp" 
          alt="Portfolio Export" 
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h2 className="text-3xl font-bold mb-2">Portfolio Export Studio</h2>
        <p className="text-gray-600">Create professional portfolios and presentations</p>
      </div>

      <Tabs defaultValue="collections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <Card>
            <CardHeader>
              <CardTitle>Select Collections to Include</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button className="text-sm underline" onClick={()=> {
                    try {
                      const id = currentCollectionId || localStorage.getItem('fashionAI.currentCollectionId') || '';
                      if (id) setSelected(prev => ({ ...prev, [id]: true }));
                    } catch { /* ignore */ }
                  }}>Select current collection</button>
                </div>
                {collections.length === 0 && (
                  <div className="text-sm text-muted-foreground">No saved collections yet.</div>
                )}
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!selected[collection.id]}
                        onChange={(e)=> setSelected(prev => ({ ...prev, [collection.id]: e.target.checked }))}
                      />
                      <div>
                        <h3 className="font-semibold">{collection.title || collection.data?.name || 'Untitled'}</h3>
                        <p className="text-sm text-gray-600">{collection.description || collection.data?.inspiration || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Layout</label>
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={layoutByCollection[collection.id] || 'grid'}
                        onChange={(e)=> setLayoutByCollection(prev=> ({ ...prev, [collection.id]: e.target.value as 'grid' | 'hero' }))}
                      >
                        <option value="grid">Grid</option>
                        <option value="hero">Hero + Grid</option>
                      </select>
                      <Badge variant={collection.title ? 'default' : 'secondary'}>
                        {collection.title ? 'Ready' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Portfolio Title</Label>
                  <Input 
                    id="title"
                    value={portfolioData.title}
                    onChange={(e) => setPortfolioData({...portfolioData, title: e.target.value})}
                    placeholder="My Fashion Collection 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    value={portfolioData.description}
                    onChange={(e) => setPortfolioData({...portfolioData, description: e.target.value})}
                    placeholder="Brief description of your portfolio..."
                    rows={3}
                  />
                </div>
                {selectedCollections.length === 1 && (()=>{
                  const c = selectedCollections[0];
                  const palette = c.paletteId ? listPalettes().find(p=>p.id===c.paletteId) : undefined;
                  const fabrics = (c.fabricIds||[]).map(fid=> listFabrics().find(f=> f.id===fid)).filter(Boolean);
                  const prompts = c.promptSetId ? listPromptSets().find(p=>p.id===c.promptSetId)?.items || [] : [];
                  return (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">Editing details for: <span className="font-medium text-foreground">{c.title || c.data?.name || c.id}</span></div>
                      {palette && (
                        <div>
                          <div className="font-medium text-sm">Palette</div>
                          <div className="flex gap-1 mt-1">{palette.colors.slice(0,12).map((col,i)=> (<div key={i} className="w-5 h-5 rounded border" style={{backgroundColor: col}}/>))}</div>
                        </div>
                      )}
                      {fabrics.length>0 && (
                        <div>
                          <div className="font-medium text-sm">Fabrics ({fabrics.length})</div>
                          <div className="flex flex-wrap gap-2 mt-1">{fabrics.map(f=> (<span key={f!.id} className="text-xs border rounded px-2 py-0.5">{f!.name}</span>))}</div>
                        </div>
                      )}
                      {prompts.length>0 && (
                        <div>
                          <div className="font-medium text-sm">Prompts ({prompts.length})</div>
                          <div className="text-xs text-muted-foreground line-clamp-3">{prompts.slice(0,3).join(' · ')}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Layout & Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Layout Style</Label>
                  <Select value={portfolioData.layout} onValueChange={(value) => 
                    setPortfolioData({...portfolioData, layout: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {layoutStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="specs"
                      checked={portfolioData.includeSpecs}
                      onChange={(e) => setPortfolioData({...portfolioData, includeSpecs: e.target.checked})}
                    />
                    <Label htmlFor="specs">Include Technical Specifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="pricing"
                      checked={portfolioData.includePricing}
                      onChange={(e) => setPortfolioData({...portfolioData, includePricing: e.target.checked})}
                    />
                    <Label htmlFor="pricing">Include Pricing Information</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {exportFormats.map((format) => (
                  <div 
                    key={format.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      portfolioData.format === format.value ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setPortfolioData({...portfolioData, format: format.value})}
                  >
                    <h3 className="font-semibold">{format.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Export Preview</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Title:</strong> {portfolioData.title || 'Untitled Portfolio'}</p>
                    <p><strong>Format:</strong> {exportFormats.find(f => f.value === portfolioData.format)?.label}</p>
                    <p><strong>Layout:</strong> {layoutStyles.find(l => l.value === portfolioData.layout)?.label}</p>
                    <p><strong>Collections:</strong> {selectedCollections.length} selected</p>
                    <div className="flex items-center gap-2">
                      <input id="incimg" type="checkbox" checked={includeImages} onChange={(e)=> setIncludeImages(e.target.checked)} />
                      <label htmlFor="incimg">Include current gallery images</label>
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-medium">Caption Template</div>
                      <div className="text-xs text-muted-foreground">Use tokens: {'{index} {caption} {description} {price} {collection} {portfolio}'}</div>
                      <Textarea rows={2} className="w-full text-sm" value={captionTemplate} onChange={(e)=> setCaptionTemplate(e.target.value)} />
                    </div>
                    <div className="space-y-1 pt-2">
                      <div className="font-medium">Workspace logo</div>
                      <div className="text-xs text-muted-foreground">Used automatically from Workspace Settings.</div>
                      {brandLogo && (<div className="mt-1"><img src={brandLogo} alt="Logo" style={{ maxWidth: 160, maxHeight: 80, border: '1px solid #eee', borderRadius: 6 }} /></div>)}
                      {!brandLogo && <Button type="button" variant="outline" size="sm" onClick={()=> { window.location.href = '/workspace/'; }}>Add logo in Workspace Settings</Button>}
                    </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Social Pack</h4>
                    <Button type="button" variant="outline" onClick={async ()=>{
                      try {
                        const c = selectedCollections[0];
                        const pal = c?.paletteId ? listPalettes().find(p=>p.id===c.paletteId)?.colors : [];
                        const res = await generateSocialPack({ name: c?.title || c?.data?.name, inspiration: c?.description || c?.data?.inspiration, palette: pal || [] });
                        setSocial(res);
                      } catch (e) {
                        // Fallback local pack on fetch error
                        const c = selectedCollections[0];
                        const name = c?.title || c?.data?.name || 'Untitled Collection';
                        const inspiration = c?.description || c?.data?.inspiration || '';
                        const pal = c?.paletteId ? listPalettes().find(p=>p.id===c.paletteId)?.colors || [] : [];
                        const tags = pal.slice(0,6).map(x => '#' + x.replace(/[^a-z0-9]+/gi,'').toLowerCase()).filter(Boolean);
                        const headline = `${name}: A New Statement in ${inspiration ? inspiration.split(/[,.;]/)[0] : 'Modern Style'}`.slice(0, 80);
                        const press_blurb = `${name} channels ${inspiration || 'a confident, contemporary aesthetic'}, balancing silhouette and texture in versatile, editorial-ready looks.`;
                        const tweet = `${name} — ${inspiration || 'new-season perspectives in modern tailoring and texture.'} ${tags.slice(0,3).join(' ')}`.slice(0, 260);
                        const instagram = {
                          caption: `${name}\n\n${inspiration || 'A refined mix of line, movement, and material.'}\n\n${tags.join(' ')}`.slice(0, 2000),
                          hashtags: tags,
                        };
                        setSocial({ headline, press_blurb, tweet, instagram });
                        alert(e?.message || 'Server unavailable — generated a local social pack.');
                      }
                    }}>Generate</Button>
                  </div>
                  {social ? (
                    <div className="text-sm space-y-2">
                      <div>
                        <div className="font-medium">Headline</div>
                        <div>{social.headline}</div>
                      </div>
                      <div>
                        <div className="font-medium">Press blurb</div>
                        <div>{social.press_blurb}</div>
                      </div>
                      <div>
                        <div className="font-medium">Tweet</div>
                        <div>{social.tweet}</div>
                      </div>
                      <div>
                        <div className="font-medium">Instagram</div>
                        <div>{social.instagram?.caption}</div>
                        <div className="text-xs text-muted-foreground">{(social.instagram?.hashtags||[]).join(' ')}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Click Generate to create a social media pack (headline, press blurb, tweet, Instagram caption + hashtags).</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button onClick={handleExport} className="w-full" size="lg">
                   Export Portfolio
                  </Button>
                  <Button onClick={openPrintCatalogue} variant="outline" className="w-full" size="lg">
                    Printable Catalogue (PDF via Print)
                  </Button>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h4 className="font-semibold">Business Card</h4>
                  <div className="text-xs text-muted-foreground">Uses designer details and the logo saved in Workspace Settings.</div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business card logo</label>
                    {cardLogo && <div className="mt-1"><img src={cardLogo} alt="Card logo" style={{ maxWidth: 160, maxHeight: 80, border: '1px solid #eee', borderRadius: 6 }} /></div>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button onClick={downloadBusinessCardPng} className="w-full" variant="secondary">
                      Business Card: Download PNG
                    </Button>
                    <Button onClick={printBusinessCard} className="w-full" variant="secondary">
                      Business Card: Print PDF
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button onClick={downloadBusinessCardPng} className="w-full" variant="secondary">
                    Business Card: Download PNG
                  </Button>
                  <Button onClick={printBusinessCard} className="w-full" variant="secondary">
                    Business Card: Print PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
