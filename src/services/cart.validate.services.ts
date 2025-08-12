// services/cartValidationService.ts
import prisma from "../config/prisma";
import { ProductData } from "../types/checkout.types";

export const validateCartItems = async (
  uid: string,
  productDatas: ProductData[]
) => {
  const productIds = productDatas.map((p) => p.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      discountedPrice: true,
      category: {
        select: { name: true },
      },
      images: {
        where: { isMain: true },
        select: { imageUrl: true },
        take: 1,
      },
      productSizes: {
        select: { stockName: true, stock: true },
      },
    },
  });

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: uid, productId: { in: productIds } },
    select: { productId: true, stockName: true, quantity: true },
  });

  const cartMap = new Map<string, Map<string, number>>();
  cartItems.forEach((item) => {
    if (!cartMap.has(item.productId)) {
      cartMap.set(item.productId, new Map());
    }
    cartMap.get(item.productId)!.set(item.stockName, item.quantity);
  });

  let canProceed = true;
  let message = "All items are valid";
  const validatedItems: Array<{
    productId: string;
    productName: string;
    productDescription: string | null;
    productImageUrl: string | null;
    productCategory: string | null;
    stockName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }> = [];

  let totalOrderAmount = 0;

  for (const { productId, productVarient } of productDatas) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      canProceed = false;
      message = `Product ${productId} not found or inactive`;
      break;
    }

    const variant = product.productSizes.find(
      (v) => v.stockName === productVarient
    );
    if (!variant) {
      canProceed = false;
      message = `Variant ${productVarient} not available for ${product.name}`;
      break;
    }

    const cartQty = cartMap.get(productId)?.get(productVarient) ?? 0;
    if (cartQty === 0) {
      canProceed = false;
      message = `Product ${product.name} with size ${productVarient} not in cart`;
      break;
    }

    if (variant.stock < cartQty) {
      canProceed = false;
      message = `Only ${variant.stock} left for ${product.name} (${productVarient})`;
      break;
    }

    const unitPrice = product.discountedPrice.toNumber();
    const itemTotal = unitPrice * cartQty;

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      productImageUrl: product.images[0]?.imageUrl || null,
      productCategory: product.category?.name || null,
      stockName: productVarient,
      quantity: cartQty,
      price: unitPrice,
      totalPrice: itemTotal,
    });

    totalOrderAmount += itemTotal;
  }

  return {
    canProceed,
    message,
    validatedItems: canProceed ? validatedItems : [],
    totalOrderAmount: canProceed ? totalOrderAmount : 0,
  };
};
