import { Router } from "express";
import crypto from "crypto";
import { PrismaClient } from "../generated/prisma";
import nodemailer from "nodemailer";

const route = Router();
const prisma = new PrismaClient();

route.post("/razorpay", async (req, res) => {
  try {
    const rawBody = req.body();
    const signature = req.headers["x-razorpay-signature"] as string;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RZP_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({
        message: "Invalid Signature",
      });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const updatedOrder = await prisma.order.update({
        where: {
          razorpayOrderId: payment.order_id,
        },
        data: {
          razorpayPaymentId: payment.id,
          status: "SUCCESS",
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (updatedOrder) {
        const transporter = nodemailer.createTransport({
          host: "sandbox.smtp.mailtrap.io",
          port: 2525,
          auth: {
            user: process.env.MAILTRAP_USERNAME,
            pass: process.env.MAILTRAP_PASSWORD,
          },
        });
        await transporter.sendMail({
          from: "your@example.com",
          to: updatedOrder.user.email,
          subject: `Your order with product id ${updatedOrder.productId} has been successfully placed.`,
        });
      }
      return res.status(200).json({
        message: "Payment completed successfully.",
      });
    }

    return res.status(402).json({
      message: "Payment error. Please try again",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
        message: "Internal Server Error",
      });
  }
});

export default route;
