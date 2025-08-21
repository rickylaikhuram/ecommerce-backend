import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
export const sendOtpSms = async (phone: string, otp: string): Promise<boolean> => {
  const API = process.env.SMS_API_KEY!; 
  const URL = `https://sms.renflair.in/V1.php?API=${API}&PHONE=${phone}&OTP=${otp}`;

  try {
    const response = await axios.get(URL);
    const data = response.data;


    if (data.status === "SUCCESS") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
