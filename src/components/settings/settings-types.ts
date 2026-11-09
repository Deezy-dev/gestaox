import { LucideIcon } from 'lucide-react';

export interface TvPackage {
  id: string;
  name: string;
  channelsCount: number;
  price: number;
  maxTvs: number;
  description: string;
  active: boolean;
}

export interface CoverageNeighborhood {
  id: string;
  name: string;
  sector: string;
  pdosCount: number;
  status: 'ativo' | 'expansao' | 'planeado';
  notes: string;
}

export interface InternetPlan {
  id: string;
  name: string;
  speed: string;
  price: number;
}

export interface SettingsTabItem {
  id: string;
  label: string;
  category: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
}

export interface ContractClause {
  id: string;
  title: string;
  text: string;
}

