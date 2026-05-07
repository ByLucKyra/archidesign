export type ViewMode = '2D' | '3D';

export interface Asset {
  id: string;
  name: string;
  category: 'Structure' | 'Doors & Windows' | 'Furniture' | 'Plumbing';
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  iconName: string;
}

export interface DesignItem {
  id: string;
  assetId: string;
  name: string;
  category?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  points?: {x: number, y: number}[];
  jointType?: 'rounded' | 'squared';
}
