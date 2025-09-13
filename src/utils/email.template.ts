

// text order confirmation for email
export function generateOrderConfirmationText(order: any): string {
  const itemsList = order.orderItems
    .map(
      (item: any) =>
        `• ${item.productName} (${item.stockName}) - Qty: ${
          item.quantity
        } - ₹${(item.price * item.quantity).toFixed(2)}`
    )
    .join("\n");

  return `
THANK YOU FOR YOUR ORDER!
Order #${order.orderNumber}

Hello ${order.customerName},

We've received your order and it's now being processed.

ORDER SUMMARY:
${itemsList}

Total: ₹${order.totalAmount.toFixed(2)}

SHIPPING ADDRESS:
${order.shippingFullName}
${order.shippingLine1}${order.shippingLine2 ? ", " + order.shippingLine2 : ""}
${order.shippingCity}, ${order.shippingState}, ${order.shippingZipCode}
${order.shippingCountry}
Phone: ${order.shippingPhone}

We'll send you another update when your items are shipped.

© ${new Date().getFullYear()} Clover Arena. All rights reserved.
  `.trim();
}

// html order confirmation for email
export function generateOrderConfirmationHtml(order: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Confirmation</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles for better email client compatibility */
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
    
    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding: 10px !important;
      }
      .mobile-text {
        font-size: 14px !important;
      }
      .mobile-hide {
        display: none !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your order #${order.orderNumber} has been confirmed and is being processed.
  </div>

  <!-- Main container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <!-- Email content wrapper -->
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #4f46e5; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; line-height: 1.2;">
                Thank you for your order!
              </h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 18px;">
                Order #${order.orderNumber}
              </p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td class="mobile-padding" style="padding: 30px 20px;">
              
              <!-- Greeting -->
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 24px; font-weight: normal;">
                Hello ${order.customerName},
              </h2>
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                We've received your order and it's now being processed. We'll keep you updated on its progress.
              </p>

              <!-- Order summary -->
              <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                Order Summary
              </h3>

              <!-- Items table -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 8px; text-align: left; color: #374151; font-size: 14px; font-weight: 600; border-bottom: 1px solid #d1d5db;">
                      Item
                    </th>
                    <th style="padding: 12px 8px; text-align: center; color: #374151; font-size: 14px; font-weight: 600; border-bottom: 1px solid #d1d5db; width: 60px;">
                      Qty
                    </th>
                    <th style="padding: 12px 8px; text-align: right; color: #374151; font-size: 14px; font-weight: 600; border-bottom: 1px solid #d1d5db; width: 80px;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${order.orderItems
                    .map(
                      (item: any) => `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 15px 8px; vertical-align: top;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding-right: 10px; vertical-align: top;">
                              <img src="${item.productImageUrl}" 
                                   alt="${item.productName}" 
                                   width="60" height="60" 
                                   style="display: block; border-radius: 6px; object-fit: cover;" />
                            </td>
                            <td style="vertical-align: top;">
                              <div style="color: #1f2937; font-size: 15px; font-weight: 500; line-height: 1.3; margin-bottom: 4px;">
                                ${item.productName}
                              </div>
                              <div style="color: #6b7280; font-size: 13px;">
                                ${item.stockName}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td style="padding: 15px 8px; text-align: center; color: #374151; font-size: 15px;">
                        ${item.quantity}
                      </td>
                      <td style="padding: 15px 8px; text-align: right; color: #1f2937; font-size: 15px; font-weight: 600;">
                        ₹${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>

              <!-- Total -->
              <div style="text-align: right; margin-bottom: 30px;">
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; display: inline-block;">
                  <span style="color: #1f2937; font-size: 18px; font-weight: bold;">
                    Total: ₹${order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <!-- Shipping address -->
              <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                Shipping Address
              </h3>
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                  <strong>${order.shippingFullName}</strong><br/>
                  ${order.shippingLine1}${
    order.shippingLine2 ? "<br/>" + order.shippingLine2 : ""
  }<br/>
                  ${order.shippingCity}, ${order.shippingState} ${
    order.shippingZipCode
  }<br/>
                  ${order.shippingCountry}<br/>
                  <span style="color: #6b7280;">Phone: ${
                    order.shippingPhone
                  }</span>
                </p>
              </div>

              <!-- Next steps -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.5;">
                  <strong>What's Next?</strong><br/>
                  We'll send you another update when your items are shipped with tracking information.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                © ${new Date().getFullYear()} Clover Arena. All rights reserved.<br/>
                <span class="mobile-hide">This email was sent regarding your recent order.</span>
              </p>
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
