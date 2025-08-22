export function generateOrderNumber() {
  const prefix = "ORD";
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // timestamp + random = almost impossible collision
  const timestamp = today.getTime().toString(36).toUpperCase(); // encodes ms
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${prefix}-${dateStr}-${timestamp}${randomPart}`;
}
