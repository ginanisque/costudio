export type ImageItem = {
id: string;
prompt: string;
category?: string;
size?: "256x256" | "512x512" | "1024x1024";
// One of the following will be present
url?: string; // if you store remote URLs
b64?: string; // if proxy returns base64
// Optional metadata for export
fileName?: string;
createdAt?: string; // ISO
};