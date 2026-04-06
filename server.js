require("dotenv").config();

// 🔥 FORCE IPV4 (extra safety)
require("dns").setDefaultResultOrder("ipv4first");

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const stripe = Stripe(process.env.STRIPE_SECRET);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// 📩 CONTACT EMAIL (IPV4 FIXED)
app.post("/contact", async (req, res) => {
  try {
    console.log("📩 CONTACT HIT:", req.body);
    console.log("EMAIL ENV:", !!process.env.EMAIL);
    console.log("PASS ENV:", !!process.env.PASS);

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing fields"
      });
    }

    // 🔥 FIXED TRANSPORTER
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4, // ✅ FORCE IPV4 (MAIN FIX)
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
      }
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "New Client: " + name,
      text: `From: ${email}\n\n${message}`
    });

    console.log("✅ EMAIL SENT:", info.response);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// 💳 STRIPE
app.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("💳 REQUEST:", req.body);

    const plan = req.body?.plan || "basic";

    const prices = {
      basic: 10000,
      business: 30000,
      advanced: 50000
    };

    const names = {
      basic: "Basic Website",
      business: "Business Website",
      advanced: "Advanced Website"
    };

    if (!prices[plan]) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: names[plan]
          },
          unit_amount: prices[plan]
        },
        quantity: 1
      }],
      success_url: `${BASE_URL}/?success=true`,
      cancel_url: `${BASE_URL}/?canceled=true`
    });

    console.log("✅ SESSION:", session.id);

    res.json({ id: session.id });

  } catch (err) {
    console.error("❌ STRIPE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Running on ${BASE_URL}`);
});