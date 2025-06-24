import bcrypt, { genSalt, hash } from "bcrypt";

export const generateSalt = async (rounds: number = 10): Promise<string> => {
  const salt = await genSalt(rounds);
  return salt;
};

export const hashPassword = async (
  password: string,
  salt: string
): Promise<string> => {
  const hashed = await hash(password, salt);
  return hashed;
};
