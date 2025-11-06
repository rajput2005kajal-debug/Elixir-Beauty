// server.js
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = "elixir_secret_key_123"; // JWT ke liye secret

// ✅ MySQL Connection Setup
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ratan123", // apna MySQL password
  database: "elixir_store"
});

// ✅ Connect to MySQL
db.connect(err => {
  if (err) console.error("❌ MySQL Connection Failed:", err);
  else console.log("✅ MySQL Connected Successfully!");
});

// ✅ Create Users Table
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;
db.query(createUsersTable, err => {
  if (err) console.error("❌ Error Creating Users Table:", err);
  else console.log("✅ users table is ready!");
});

// ✅ Create Orders Table
const createOrdersTable = `
CREATE TABLE IF NOT EXISTS new_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  payment_method VARCHAR(50),
  total_amount DECIMAL(10,2),
  items JSON,
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP
)
`;
db.query(createOrdersTable, err => {
  if (err) console.error("❌ Error Creating new_orders Table:", err);
  else console.log("✅ new_orders table is ready!");
});

// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rajput.2005.kajal@gmail.com",
    pass: "mleb lswk fjyp vxie"
  }
});

transporter.verify((error, success) => {
  if (error) console.log("❌ Email Transport Error:", error);
  else console.log("📨 Email Transporter ready to send mails!");
});


// ======================= 🧩 AUTH ROUTES ==========================

// ✅ Signup
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(400).json({ success: false, message: "Email already registered" });
        console.error("❌ Signup Error:", err);
        return res.status(500).json({ success: false, message: "Signup failed" });
      }
      res.json({ success: true, message: "User registered successfully!" });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0)
      return res.status(400).json({ success: false, message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "2h" });
    res.json({ success: true, message: "Login successful", token });
  });
});

// ✅ Middleware to verify token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err)
      return res.status(401).json({ success: false, message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// ✅ Check if user is logged in (for frontend)
app.get("/api/check-auth", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});


// ======================= 💳 ORDER ROUTE ==========================

// ✅ Save Order API (only if user is logged in)
app.post("/api/save-order", verifyToken, (req, res) => {
  const { name, email, paymentMethod, totalAmount, items } = req.body;

  if (!email || !paymentMethod || !totalAmount || !items)
    return res.status(400).json({ success: false, message: "Missing order details" });

  const customerName = name || "Valued Customer";
  const sql = `
    INSERT INTO new_orders (name, email, payment_method, total_amount, items)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [customerName, email, paymentMethod, totalAmount, JSON.stringify(items)], (err, result) => {
    if (err) {
      console.error("❌ Database Insert Error:", err);
      return res.status(500).json({ success: false, message: "Database insert failed" });
    }

    console.log("✅ Order Saved:", { id: result.insertId, email, totalAmount });

    const mailOptions = {
      from: "rajput.2005.kajal@gmail.com",
      to: email,
      subject: "Your Elixir Beauty Order Confirmation 💜",
      text: `Hello ${customerName},\n\nYour order of $${totalAmount} via ${paymentMethod} has been successfully placed!\n\nThank you for shopping with Elixir Beauty Co.\n\n💜 Love, Team Elixir`
    };

    transporter.sendMail(mailOptions, error => {
      if (error) console.error("❌ Email Send Failed:", error);
      else console.log(`✅ Confirmation email sent to ${email}`);
    });

    return res.json({ success: true, message: "Order saved & email sent!" });
  });
});

// ✅ Contact Form Save API (Manual Table)
app.post("/api/contact", (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  const sql = `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`;

  db.query(sql, [name, email, subject, message], (err, result) => {
    if (err) {
      console.error("❌ Database Insert Error:", err);
      return res.status(500).json({ success: false, message: "Database insert failed" });
    }

    console.log("✅ Message Saved:", { id: result.insertId, name, email });

    // Optional: Email confirmation
    const mailOptions = {
      from: "rajput.2005.kajal@gmail.com",
      to: email,
      subject: "Thank You for Contacting Elixir Beauty 💜",
      text: `Hello ${name},\n\nWe’ve received your message regarding "${subject}". Our team will get back to you soon!\n\n💜 Love, Team Elixir`
    };

    transporter.sendMail(mailOptions, error => {
      if (error) console.error("❌ Email Send Failed:", error);
      else console.log(`✅ Confirmation email sent to ${email}`);
    });

    return res.json({ success: true, message: "Message saved successfully!" });
  });
});


// ======================= ⚙️ TEST ROUTE ==========================

app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: "rajput.2005.kajal@gmail.com",
      to: "rajput.2005.kajal@gmail.com",
      subject: "Test Email from Elixir Server 💜",
      text: "If you got this, your email setup is working perfectly!"
    });
    res.send("✅ Test email sent successfully!");
  } catch (err) {
    console.error("❌ Email test failed:", err);
    res.send("❌ Email failed. Check console.");
  }
});

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Unexpected Error:", err);
  res.status(500).json({ success: false, message: "Server error" });
});

// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
