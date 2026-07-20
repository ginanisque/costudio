import Papa from "papaparse";


export async function fileToText(file: File) {
return await file.text();
}


export function parsePromptsFromCSV(csvText: string): string[] {
const { data } = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
if (!Array.isArray(data)) return [];


// Find a header named like prompt
const first = data[0];
const headerLike = first?.map((h) => String(h || "").toLowerCase().trim());
let promptIdx = -1;
if (headerLike && headerLike.length && headerLike.some(Boolean)) {
promptIdx = headerLike.findIndex((h) => /^(prompt|prompts|description)$/i.test(h));
}


const rows = data.slice(promptIdx >= 0 ? 1 : 0);
const prompts: string[] = [];
for (const row of rows as string[][]) {
if (!Array.isArray(row)) continue;
if (promptIdx >= 0) {
const cell = row[promptIdx];
if (cell) prompts.push(String(cell).trim());
} else if (row[0]) {
prompts.push(String(row[0]).trim());
}
}
return prompts.filter(Boolean);
}


export function toCSV(rows: Record<string, unknown>[]) {
return Papa.unparse(rows);
}