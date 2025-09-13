// src/services/emailService.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOrderConfirmation(
  email: string,
  subject: string,
  html: string,
  text: string,
) {
  try {
    await transporter.sendMail({
      from: `"Clover Arena" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html,
      text, // Plain text fallback
    });
    console.log(`Order confirmation email sent to ${email}`);
  } catch (error) {
    console.error(" Failed to send order confirmation:", error);
    throw error;
  }
}

