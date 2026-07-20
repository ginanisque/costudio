export const COSTING_HANDOFF_KEY = 'costudio.designHandoff.v1';

export type CostingHandoff = {
  version: 1;
  createdAt: string;
  collection: {
    id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    launchYear: string;
    palette: string[];
    fabrics: Array<{ name: string; description?: string }>;
    pieceCount: number;
  };
};

export function continueToCosting(collection: CostingHandoff['collection']) {
  const handoff: CostingHandoff = {
    version: 1,
    createdAt: new Date().toISOString(),
    collection,
  };

  localStorage.setItem(COSTING_HANDOFF_KEY, JSON.stringify(handoff));
  window.location.assign(new URL('../costing/?from=design', document.baseURI).toString());
}
