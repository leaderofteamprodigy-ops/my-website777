require("dotenv").config();

const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
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

    res.json({ success: true });
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Email failed"
    });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  try {
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
      return res.status(400).json({
        error: "Invalid plan"
      });
    }

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: names[plan]
            },
            unit_amount: prices[plan]
          },
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("STRIPE ERROR:", err);
    res.status(500).json({
      error: err.message || "Stripe failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});