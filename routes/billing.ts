import { Router } from "express";
import { PrismaClient } from "../generated/prisma";
import { authMiddleware } from "../auth-middleware";
import Razorpay from "razorpay";

const router = Router();

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY || "123",
  key_secret: process.env.RZP_SECRET || "123",
});

router.post("/ini-subscribe", authMiddleware, async (req, res) => {
  // create razorpay order
  try {
    const order = await razorpay.orders.create({
      amount: 99 * 100,
      currency: "INR",
      receipt: `receipt-${Date.now()}`,
      notes: {
        productId: "random-product_id",
      },
    });

    const newOrder = await prisma.order.create({
      data: {
        userId: req.userId,
        productId: "macbook-air m4",
        amount: 99 * 100,
        razorpayOrderId: order.id,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      dbOrderId: newOrder.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

export default router;
