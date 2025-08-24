/*
  Warnings:

  - A unique constraint covering the columns `[razorpayOrderId]` on the table `order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "order_razorpayOrderId_key" ON "public"."order"("razorpayOrderId");
