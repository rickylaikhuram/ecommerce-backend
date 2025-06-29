import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import { DecodedToken } from "../types/customTypes";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

//generate token
export const generateToken = (
  data: JwtPayload,
  expiresIn: SignOptions["expiresIn"]
) : string  => {

  // Validate JWT_SECRET parameter
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
      "Invalid JWT_SECRET: Must be defined in environment variables and at least 32 characters long"
    );
  }

  // Validate expiresIn parameter
  if (!expiresIn) {
    throw new Error("Expiration time (expiresIn) is required");
  }

  // Create signing options
  const options: SignOptions = {
    expiresIn,
    algorithm: "HS256",
  };

  const token = jwt.sign(data, JWT_SECRET, options);
  return token;
};

//verify token
export const verifyToken = (token: string): DecodedToken => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add runtime check (optional but good practice)
    if (typeof decoded !== "object" || !("uid" in decoded)) {
      throw new Error("Token structure invalid");
    }

    return decoded as DecodedToken;
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid or expired token");
  }
};

//only decode token
export const decodeToken = (token: string): DecodedToken => {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded !== "object" || !("uid" in decoded)|| !("role" in decoded)) {
    throw new Error("Invalid or malformed token payload");
  }

  return decoded as DecodedToken;
};
