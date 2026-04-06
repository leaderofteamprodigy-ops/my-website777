require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// 🔥 DEBUG CHECK
console.log("STRIPE KEY EXISTS:", !!process.env.STRIPE_SECRET);
console.log("EMAIL EXISTS:", !!process.env.EMAIL);
console.log("PASS EXISTS:", !!process.env.PASS);

// 🔥 STRIPE INIT (WILL FAIL IF KEY MISSING)
const stripe = Stripe(process.env.STRIPE_SECRET);
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// 📩 EMAIL
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "New Client: " + name,
      text: `From: ${email}\n\n${message}`
    });

    console.log("✅ EMAIL SENT");
    res.json({ success: true });

  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// 💳 STRIPE
app.post("/create-checkout-session", async (req, res) => {
  try {
    const plan = req.body?.plan || "basic";

    const prices = {
      basic: 10000,
      business: 30000,
      advanced: 50000
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: plan + " website"
          },
          unit_amount: prices[plan]
        },
        quantity: 1
      }],
      success_url: `${BASE_URL}/?success=true`,
      cancel_url: `${BASE_URL}/?canceled=true`
    });

    res.json({ id: session.id });

  } catch (err) {
    console.error("❌ STRIPE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// START
app.listen(PORT, () => {
  console.log(`🚀 Running on ${BASE_URL}`);
});