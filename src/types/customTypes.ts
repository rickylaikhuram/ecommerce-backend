import { Request } from "express";
import { User,Product } from "@prisma/client";

export interface DecodedToken {
  uid: string;
  role: "admin" | "guest" | "user";
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface UserExtend extends Request {
  user?: User;
}

export interface AuthRequest extends Request {
  user?: DecodedToken;
  userData?: User;
}
export interface ProductRequest extends Request {
  product?: Product;
}


export type GuestCartItem = {
  productId: string;
  stockname: string;
  quantity: number;
};

export interface UploadRequestBody {
  fileName: string;
  fileType: string;
}

export interface DeleteRequestBody {
  key: string;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  mainImage: {
    imageUrl: string;
    altText: string | null;
  } | null;
  quantity: number;
  stockName: string;
  addedAt: Date;
  category: {
    id: string;
    name: string;
    parentCategory: {
      id: string;
      name: string;
    } | null;
  };
  inStock: boolean;
  stockVariantInStock: boolean;
  availableStock: number;
  subtotal: number;
  originalSubtotal: number;
  discount: number;
}

export interface CartSummary {
  totalItems: number;
  totalUniqueItems: number;
  totalPrice: number;
  totalOriginalPrice: number;
  totalDiscount: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  summary: CartSummary;
}