export interface ImageToDelete {
  imageUrl: string;
}
export type UserData = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }[];
};
export type CustomerWithOrders = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }[];
};
