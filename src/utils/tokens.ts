import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

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
