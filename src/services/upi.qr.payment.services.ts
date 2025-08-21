// services/clovershopPayment.ts
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const CLOVERSHOP_CREATE_ORDER_URL = process.env.CLOVERSHOP_CREATE_ORDER_URL!;
const CLOVERSHOP_API_TOKEN = process.env.CLOVERSHOP_API_TOKEN!;
const REDIRECT_URL = process.env.REDIRECT_URL!;

interface CloverCreateOrderResponse {
  status: boolean | string; // API returns boolean true for success, string "false" for failure
  message: string;
  result?: {
    orderId: string;
    payment_url: string;
  };
}

export async function createCloverOrder(
  customerMobile: string,
  amount: number,
  orderId: string,
  remark1?: string
) {
  const redirectUrl = REDIRECT_URL + orderId;
  const params = new URLSearchParams();
  params.append("customer_mobile", customerMobile);
  params.append("user_token", CLOVERSHOP_API_TOKEN);
  params.append("amount", String(amount)); 
  params.append("order_id", orderId);
  params.append("redirect_url", redirectUrl);
  params.append("remark1", remark1 || "");

  try {
    const { data } = await axios.post<CloverCreateOrderResponse>(
      CLOVERSHOP_CREATE_ORDER_URL,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // Check for both boolean false and string "false"
    if (data.status === false || data.status === "false") {
      throw new Error(data.message || "Failed to create Clover order");
    }

    if (!data.result) {
      throw new Error("Invalid response: missing result data");
    }

    return data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Clover API Error:", error.response?.data);
      console.error("Status Code:", error.response?.status);
      throw new Error(
        error.response?.data?.message ||
          `Clover API error: ${error.response?.status || "Unknown"}`
      );
    }
    throw error;
  }
}
