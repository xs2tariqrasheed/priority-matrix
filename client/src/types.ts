export type Impact = "P" | "V";
export type Focus = "S" | "L";
export type QuadrantKey = `${Impact}${Focus}`;

export interface Item {
  id: number;
  title: string;
  area: string;
  category: string;
  impact: Impact;
  focus: Focus;
  notes: string;
  done: boolean;
  allocatedMinutes: number;
  spentMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemInput {
  title: string;
  area: string;
  category?: string;
  impact: Impact;
  focus: Focus;
  notes?: string;
  done?: boolean;
  allocatedMinutes?: number;
  spentMinutes?: number;
}

export type ItemPatch = Partial<ItemInput>;

export interface Settings {
  weeklyMinutes: number;
}
