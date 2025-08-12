export interface ProductData {
  productId: string;
  productVarient: string;
  quantity: number;
}

export interface CreateOrderRequest {
  productDatas: ProductData[];
  address: {
    fullName: string;
    phone: string;
    alternatePhone?: string;
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    label?: string;
    isDefault?: boolean;
  };
}