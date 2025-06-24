// import { Router } from "express";
// import { Request,Response } from "express";
// import { PrismaClient } from "@prisma/client";
// import {
//   userSignupMiddleware,
//   userSigninMiddleware,
//   userRegisterMiddleware,
// } from "../middlewares/adminMiddlewares";

// const app = Router();
// const prisma = new PrismaClient();

// interface CostomRequestSignup extends Request {
//   email?: string;
//   name?: string;
//   password?: string;
// }

// //admin sign up route
// app.post(
//   "/signup",
//   userSignupMiddleware,
//   async (req: CostomRequestSignup, res: Response) => {
//     const name = req.name;
//     const email = req.email;
//     const password = req.password;

//     try {
//       const user = await prisma.user.create({
//         data: {
//           email: email!,
//           name: name!,
//           password: password!,
//         },
//       });
//       const details = {
//         email: user.email,
//         role: "USER",
//         uid: user.id,
//       };
//       const userData = {
//         email: user.email,
//         name: user.name,
//       };
//       const token = jwt.sign(details, JWT_SECRET, { expiresIn: "7d" });
//       res.status(201).json({
//         message: "User registered successfully",
//         authorization: "Bearer " + token,
//         userData,
//       });
//     } catch (error) {
//       res.status(500).json({ message: "Internal server error", error: error });
//     }
//   }
// );
// export default app;