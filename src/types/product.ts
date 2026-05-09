export type Product = {
  id: string;
  ownerId: string;
  businessId: string;
  name: string;
  defaultPrice: number | null;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  displayOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecent = {
  id: string;
  name: string;
  defaultPrice: number | null;
};
