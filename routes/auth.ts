import { Router } from "express";
import { perMinuteLimiter, perMinuteLimiterRelaxed } from "../ratelimitter";
import { CreateUser, SignIn } from "../lib/types";
import { TOTP } from "totp-generator";
import base32 from "hi-base32";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { authMiddleware } from "../auth-middleware";
import { PrismaClient } from "../generated/prisma";

const router = Router();
const prisma = new PrismaClient();

// Temporarily adding local user otp cache
const otpCache = new Map<string, string>();

router.post("/initiate_signin", perMinuteLimiter, async (req, res) => {
  try {
    const { success, data } = CreateUser.safeParse(req.body);

    if (!success) {
      return res.status(411).send("Invalid input");
    }

    // Generate TOTP using email and secret
    console.log("before send email");
    const { otp } = TOTP.generate(
      base32.encode(data.email + process.env.JWT_SECRET)
    );
    console.log("email is", data.email);
    console.log("otp is", otp);

    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });

    await transporter.sendMail({
        from: "no-reply@example.com",
        to: data.email,
        subject: "Your sign-in code",
        text: `Your otp is:- ${otp}`,
      });

    otpCache.set(data.email, otp);

    try {
      await prisma.user.create({
        data: {
          email: data.email,
        },
      });
    } catch (e) {
      console.log("User already exists");
    }

    res.json({
      message: "Check your email",
      success: true,
    });
  } catch (e) {
    console.log(e);
    res.json({
      message: "Internal server error",
      success: false,
    });
  }
});

router.post("/signin", perMinuteLimiterRelaxed, async (req, res) => {
  const { success, data } = SignIn.safeParse(req.body);

  if (!success) {
    return res.status(411).send("Invalid input");
  }

  console.log("data is");
  console.log(data);
  console.log("otpCache is", otpCache.get(data.email));

  if (otpCache.get(data.email) != data.otp) {
    console.log("invalid otp");
    return res.status(401).json({
      message: "Invalid otp",
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    return res.json({
      message: "User not found",
      success: false,
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET!
  );

  res.status(200).json({
    message: "Logged in successfully",
    token,
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!user) {
    return res.status(401).send({
      message: "Unauthorized",
      success: false,
    });
  }

  return res.json({
    user: {
      id: user?.id,
      email: user?.email,
    },
  });
});

export default router;
