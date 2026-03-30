const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "https://your-frontend-domain.com",
      "https://www.ihatemoving.co.uk"
    ],
    methods: ["POST", "OPTIONS"],
  })
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASSWORD,
  },
});

app.post("/api/send-quote", upload.single("audio"), async (req, res) => {
  console.log(req.body)
  try {
  const cleanedBody = Object.fromEntries(
  Object.entries(req.body).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value])
);

const {
  mode,
  fromPostcode,
  toPostcode,
  propertyType,
  floorLevel,
  liftAvailable,
  bedrooms,
  moveDate,
  flexibleDates,
  fullName,
  email,
  phone,
  consent,
  otherItems,
  inventory,
} = cleanedBody;

    let audioUrl = "";

    if (req.file) {
      const safeFileName = `quotes/${Date.now()}-${req.file.originalname.replace(/\s+/g, "-")}`;

      const { error: uploadError } = await supabase.storage
        .from("quote-audio")
        .upload(safeFileName, req.file.buffer, {
          contentType: req.file.mimetype || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "Audio upload failed" });
      }

      const { data } = supabase.storage
        .from("quote-audio")
        .getPublicUrl(safeFileName);

      audioUrl = data?.publicUrl || "";
    }

    const html = `
      <h2>New Moving Quote Request</h2>
      <p><strong>Mode:</strong> ${mode || "-"}</p>
      <p><strong>Full Name:</strong> ${fullName || "-"}</p>
      <p><strong>Email:</strong> ${email || "-"}</p>
      <p><strong>Phone:</strong> ${phone || "-"}</p>
      <hr />
      <p><strong>From Postcode:</strong> ${fromPostcode || "-"}</p>
      <p><strong>To Postcode:</strong> ${toPostcode || "-"}</p>
      <p><strong>Property Type:</strong> ${propertyType || "-"}</p>
      <p><strong>Floor Level:</strong> ${floorLevel || "-"}</p>
      <p><strong>Lift Available:</strong> ${liftAvailable || "-"}</p>
      <p><strong>Bedrooms:</strong> ${bedrooms || "-"}</p>
      <p><strong>Move Date:</strong> ${moveDate || "-"}</p>
      <p><strong>Flexible Dates:</strong> ${flexibleDates || "-"}</p>
      <p><strong>Consent:</strong> ${consent || "-"}</p>
      <p><strong>Other Items:</strong> ${otherItems || "-"}</p>
      <hr />
      <p><strong>Inventory:</strong></p>
      <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${inventory || "No items added"}</pre>
      ${
        audioUrl
          ? `<p><strong>Audio File:</strong> <a href="${audioUrl}" target="_blank" rel="noopener noreferrer">${audioUrl}</a></p>`
          : ""
      }
    `;

await transporter.sendMail({
  from: `"${fullName || "Website Lead"} via I Hate Moving" <${process.env.MAIL_EMAIL}>`,
  to: "duryav@themetroweb.com",
  subject: `New Quote Request - ${fullName || "User"} (${email || "No Email"})`,
  html,
  replyTo: email || undefined,
});

    res.status(200).json({ success: true, audioUrl });
  } catch (error) {
    console.error("Send quote error:", error);
    res.status(500).json({ error: "Failed to send quote" });
  }
});

app.get("/", (req, res) => {
  res.send("Quote API running");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});

(async () => {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error("Supabase connection failed:", error.message);
  } else {
    console.log("Supabase connected successfully");
    console.log("Buckets:", data);
  }
})();