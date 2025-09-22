// text order confirmation for email
const S3_BASE_URL = process.env.S3_BASE_URL;
const LOGO = "logo/logo_white_detals.png";
export function generateOrderConfirmationText(
  order: any,
  paymentMethod: string
): string {
  const itemsList = order.orderItems
    .map(
      (item: any) =>
        `• ${item.productName} (${item.stockName}) - Qty: ${
          item.quantity
        } - ₹${(item.price * item.quantity).toFixed(2)}`
    )
    .join("\n");

  // Payment method specific messaging
  const getPaymentMessage = (method: string) => {
    if (
      method.toLowerCase() === "cod" ||
      method.toLowerCase() === "cash on delivery"
    ) {
      return `
        PAYMENT METHOD: Cash on Delivery (COD)

        IMPORTANT PAYMENT INSTRUCTIONS:
        • Please keep ₹${order.totalAmount.toFixed(
          2
        )} ready for the delivery person
        • We recommend keeping exact change to make the process smoother
        • Our delivery partner will collect the payment when your order arrives
        • You can pay with cash or card (if the delivery person has a card reader)

        Please be available at the delivery address to receive your order and make the payment.`;
    } else {
      return `
        PAYMENT METHOD: ${method}

        PAYMENT STATUS: ✅ Confirmed
        Your payment has been successfully processed. No further payment is required upon delivery.`;
    }
  };

  return `
    THANK YOU FOR YOUR ORDER!
    Order #${order.orderNumber}

    Hello ${order.customerName},

    We've received your order and it's now being processed.

    ${getPaymentMessage(paymentMethod)}

    ORDER SUMMARY:
    ${itemsList}

    Total: ₹${order.totalAmount.toFixed(2)}

    SHIPPING ADDRESS:
    ${order.shippingFullName}
    ${order.shippingLine1}${
    order.shippingLine2 ? ", " + order.shippingLine2 : ""
  }
    ${order.shippingCity}, ${order.shippingState}, ${order.shippingZipCode}
    ${order.shippingCountry}
    Phone: ${order.shippingPhone}

    WHAT'S NEXT?
    We'll send you another update when your items are shipped with tracking information.

    Thank you for choosing Clover Arena!

    © ${new Date().getFullYear()} Clover Arena. All rights reserved.
    `.trim();
}

// html order confirmation for email - Barcelona-inspired design with Clover Arena branding
export function generateOrderConfirmationHtml(
  order: any,
  paymentMethod: string
): string {
  // Payment method specific HTML content
  const getPaymentHtml = (method: string) => {
    if (
      method.toLowerCase() === "cod" ||
      method.toLowerCase() === "cash on delivery"
    ) {
      return `
      <div style="background: #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #374151;">
        <h3 style="margin: 0 0 12px; color: #10b981; font-size: 18px; font-weight: 600;">
          💳 Cash on Delivery (COD)
        </h3>
        <p style="margin: 0 0 8px; color: #e5e7eb; font-size: 16px; font-weight: 600;">Amount to Pay: ₹${order.totalAmount.toFixed(
          2
        )}</p>
        <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
          Keep exact change ready. Payment will be collected upon delivery. Cash or card accepted.
        </p>
      </div>`;
    } else {
      return `
      <div style="background: #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #374151;">
        <h3 style="margin: 0 0 8px; color: #10b981; font-size: 18px; font-weight: 600;">
          ✅ Payment: ${method}
        </h3>
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">Payment confirmed. No additional payment required.</p>
      </div>`;
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Order Confirmation - Clover Arena</title>
    <style>
        body, table, td, p, a, li, blockquote {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        }
        table, td {
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        }
        img {
        -ms-interpolation-mode: bicubic;
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
        }
        
        @media screen and (max-width: 600px) {
        .container {
            width: 100% !important;
            max-width: 100% !important;
        }
        .mobile-padding {
            padding: 16px !important;
        }
        .mobile-text {
            font-size: 14px !important;
        }
        .mobile-hide {
            display: none !important;
        }
        .logo-mobile {
            width: 120px !important;
            height: auto !important;
        }
        .header-mobile {
            font-size: 24px !important;
        }
        }
    </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: transparent; color: inherit;">
    
    <!-- Preheader text -->
    <div style="display: none; font-size: 1px; color: transparent; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Order #${
          order.orderNumber
        } confirmed - Thank you for choosing Clover Arena!
    </div>

    <!-- Main container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: transparent; min-height: 100vh;">
        <tr>
        <td style="padding: 20px 10px;">
            <!-- Email content wrapper -->
            <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background: transparent; border-radius: 0; overflow: visible;">
            
           <!-- Header with gradient background -->
            <tr>
              <td style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 0px 0px 0px 13px; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                <div style="text-align: left;">
                  <img 
                    src="${S3_BASE_URL}${LOGO}"
                    alt="Clover Arena" 
                    width="160" 
                    height="auto" 
                    class="logo-mobile"
                    style="display: block; max-width: 160px; height: auto;" />
                </div>
              </td>
            </tr>

            <!-- Main content -->
            <tr>
                <td class="mobile-padding" style="padding: 24px; background: transparent;">
                
                <!-- Main heading -->
                <h1 class="header-mobile" style="margin: 0 0 16px; color: inherit; font-size: 32px; font-weight: 700; line-height: 1.2;">
                    Your order is confirmed
                </h1>
                
                <p style="margin: 0 0 8px; color: inherit; opacity: 0.7; font-size: 16px; line-height: 1.5;">
                    Hi ${
                      order.customerName
                    }, your order has been received and is now being processed. We'll keep you updated on its progress.
                </p>

                <!-- Order info -->
                <div style="margin: 24px 0;">
                    <h2 style="margin: 0 0 8px; color: inherit; font-size: 24px; font-weight: 700;">
                        Order: #${order.orderNumber}
                    </h2>
                    <p style="margin: 0; color: inherit; opacity: 0.6; font-size: 14px;">
                        Placed on ${new Date().toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                    </p>
                </div>

                <!-- Payment Method Section -->
                ${getPaymentHtml(paymentMethod)}

                <!-- Items section -->
                <div style="background: #d97706; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                    <h3 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                        Items in your order
                    </h3>
                </div>

                <!-- Order items -->
                <div style="margin-bottom: 24px; overflow-x: auto;">
                    ${order.orderItems
                      .map(
                        (item: any) => `
                        <div style="background: rgba(0, 0, 0, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); min-width: 480px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="width: 80px; padding-right: 16px; vertical-align: top;">
                                        <div style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; background: rgba(0, 0, 0, 0.1);">
                                            <img 
                                                src="${S3_BASE_URL}${
                          item.productImageUrl
                        }"
                                                alt="${item.productName}" 
                                                width="80" 
                                                height="80" 
                                                style="display: block; width: 100%; height: 100%; object-fit: cover;" />
                                        </div>
                                    </td>
                                    <td style="vertical-align: top; padding-right: 16px; width: auto; overflow: hidden;">
                                        <h4 style="margin: 0 0 8px; color: inherit; font-size: 18px; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${
                                          item.productName
                                        }">
                                            ${item.productName}
                                        </h4>
                                        <p style="margin: 0 0 4px; color: inherit; opacity: 0.7; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${
                                          item.stockName
                                        }">
                                            ${item.stockName}
                                        </p>
                                        <p style="margin: 0; color: inherit; opacity: 0.7; font-size: 14px;">
                                            Quantity: ${item.quantity}
                                        </p>
                                    </td>
                                    <td style="vertical-align: top; text-align: right; width: 100px; min-width: 100px;">
                                        <p style="margin: 0; color: inherit; font-size: 20px; font-weight: 700;">
                                            ₹${(
                                              item.price * item.quantity
                                            ).toFixed(2)}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `
                      )
                      .join("")}
                </div>

                <!-- Total -->
                <div style="text-align: right; margin-bottom: 32px;">
                    <div style="background: #10b981; color: #ffffff; padding: 16px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                        <span style="font-size: 20px; font-weight: 700;">
                            Total: ₹${order.totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>

                <!-- Shipping address -->
                <div style="background: rgba(0, 0, 0, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px);">
                    <h3 style="margin: 0 0 16px; color: #10b981; font-size: 18px; font-weight: 600;">
                        🚚 Shipping Address
                    </h3>
                    <div style="color: inherit; font-size: 15px; line-height: 1.6;">
                        <p style="margin: 0 0 4px; font-weight: 600; color: inherit; font-size: 16px;">${
                          order.shippingFullName
                        }</p>
                        <p style="margin: 0; color: inherit; opacity: 0.7;">
                            ${order.shippingLine1}${
                              order.shippingLine2 ? "<br/>" + order.shippingLine2 : ""
                            }<br/>
                                                      ${order.shippingCity}, ${order.shippingState} ${
                              order.shippingZipCode
                            }<br/>
                            ${order.shippingCountry}<br/>
                            📞 ${order.shippingPhone}
                        </p>
                    </div>
                </div>

                <!-- Next steps -->
                <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; padding: 20px; margin-bottom: 32px; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
                    <h4 style="margin: 0 0 12px; color: #ffffff; font-size: 18px; font-weight: 600;">
                        🚀 What's Next?
                    </h4>
                    <p style="margin: 0; color: #e0e7ff; font-size: 15px; line-height: 1.5;">
                        You can check the status and updates of your order directly on our website.
                        ${
                          paymentMethod.toLowerCase() === "cod" ||
                          paymentMethod.toLowerCase() === "cash on delivery"
                            ? "<br/><strong style='color: #fbbf24;'>💰 Remember to keep your payment ready for delivery!</strong>"
                            : ""
                        }
                    </p>
                </div>

                <!-- Footer message -->
                <div style="text-align: center; padding: 20px 0;">
                    <p style="margin: 0; color: inherit; opacity: 0.6; font-size: 14px; line-height: 1.5;">
                        © ${new Date().getFullYear()} Clover Arena. All rights reserved.<br/>
                        Thank you for choosing us! 🙏
                    </p>
                </div>
                </td>
            </tr>
            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>
    `;
}
