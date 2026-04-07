require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const path = require("path");
const { Resend } = require("resend");
const Stripe = require("stripe");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

if (!process.env.STRIPE_SECRET) {
  console.error("❌ STRIPE_SECRET is missing");
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY is missing");
  process.exit(1);
}

if (!process.env.CONTACT_TO_EMAIL) {
  console.error("❌ CONTACT_TO_EMAIL is missing");
  process.exit(1);
}

if (!process.env.FROM_EMAIL) {
  console.error("❌ FROM_EMAIL is missing");
  process.exit(1);
}

console.log("✅ STRIPE_SECRET loaded");
console.log("✅ RESEND_API_KEY loaded");
console.log("✅ CONTACT_TO_EMAIL loaded");
console.log("✅ FROM_EMAIL loaded");

const stripe = Stripe(process.env.STRIPE_SECRET);
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/contact", async (req, res) => {
  console.log("📩 CONTACT HIT:", req.body);

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields"
    });
  }

  try {
    const data = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: [process.env.CONTACT_TO_EMAIL],
      subject: `New Client: ${name}`,
      text: `From: ${email}\n\n${message}`,
      reply_to: email
    });

    console.log("✅ EMAIL SENT:", data);

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ CONTACT ROUTE ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Email failed"
    });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  console.log("💳 REQUEST BODY:", req.body);

  const plan = req.body?.plan || "basic";

  const prices = {
    basic: 10000,
    business: 30000,
    advanced: 50000
  };

  if (!prices[plan]) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: plan.charAt(0).toUpperCase() + plan.slice(1) + " Package"
          },
          unit_amount: prices[plan]
        },
        quantity: 1
      }
    ],
    success_url: `${BASE_URL}/?success=true`,
    cancel_url: `${BASE_URL}/?canceled=true`
  });

  console.log("✅ SESSION CREATED:", session.id);

  return res.json({ id: session.id });
});

app.listen(PORT, () => {
  console.log(`🚀 Running on ${BASE_URL}`);
});