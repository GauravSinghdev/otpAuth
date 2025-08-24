import express from "express";
import cors from "cors";
import authRouter from "./routes/auth"
import billingRouter from "./routes/billing"
import razrpay_webhook from "./routes/razrpay_webhook"

const app = express()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.use(express.json())

app.get("/", (_, res) => {
    return res.send("Server of otpauth-codewithkara.")
})

app.use("/api/auth", authRouter)
app.use("/api/billing", billingRouter)
app.use("/api/razrpay_webhook", razrpay_webhook)

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});