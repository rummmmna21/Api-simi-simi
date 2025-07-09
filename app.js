const express = require("express");
const cors = require("cors");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 6403;

app.use(cors());
app.use(express.json());

const DATA_FILE = "./data.json";

let db = { questions: {} };

// Load DB if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    db = JSON.parse(data);
  }
} catch (e) {
  console.error("Error loading DB:", e);
}

// Save DB helper
function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// Random reply helper
function randomReply(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "Sorry, I don't know that yet.";
  return arr[Math.floor(Math.random() * arr.length)];
}

// Routes

// /simsimi?text=...&senderName=...
app.get("/simsimi", (req, res) => {
  const text = (req.query.text || "").toLowerCase().trim();
  if (!text) return res.json({ code: 400, message: "Missing 'text' query param." });

  const replies = db.questions[text];
  if (!replies || replies.length === 0) {
    return res.json({
      code: 404,
      response: ["Sorry, I don't know that yet. Please teach me!"]
    });
  }

  const reply = randomReply(replies);
  res.json({ code: 200, response: [reply] });
});

// /teach?ask=...&ans=...&senderID=...&senderName=...
app.get("/teach", (req, res) => {
  const ask = (req.query.ask || "").toLowerCase().trim();
  const ans = (req.query.ans || "").trim();
  if (!ask || !ans) return res.json({ code: 400, message: "Missing 'ask' or 'ans'." });

  if (!db.questions[ask]) db.questions[ask] = [];
  if (!db.questions[ask].includes(ans)) {
    db.questions[ask].push(ans);
    saveDB();
    return res.json({ code: 200, message: "Reply added successfully!" });
  } else {
    return res.json({ code: 409, message: "This reply already exists for that question." });
  }
});

// /delete?ask=...&ans=...
app.get("/delete", (req, res) => {
  const ask = (req.query.ask || "").toLowerCase().trim();
  const ans = (req.query.ans || "").trim();
  if (!ask || !ans) return res.json({ code: 400, message: "Missing 'ask' or 'ans'." });

  if (!db.questions[ask]) return res.json({ code: 404, message: "Question not found." });

  const index = db.questions[ask].indexOf(ans);
  if (index === -1) return res.json({ code: 404, message: "Reply not found." });

  db.questions[ask].splice(index, 1);
  if (db.questions[ask].length === 0) delete db.questions[ask];
  saveDB();

  res.json({ code: 200, message: "Reply deleted successfully." });
});

// /edit?ask=...&old=...&new=...
app.get("/edit", (req, res) => {
  const ask = (req.query.ask || "").toLowerCase().trim();
  const oldReply = (req.query.old || "").trim();
  const newReply = (req.query.new || "").trim();

  if (!ask || !oldReply || !newReply) return res.json({ code: 400, message: "Missing 'ask', 'old' or 'new'." });

  if (!db.questions[ask]) return res.json({ code: 404, message: "Question not found." });

  const index = db.questions[ask].indexOf(oldReply);
  if (index === -1) return res.json({ code: 404, message: "Old reply not found." });

  db.questions[ask][index] = newReply;
  saveDB();

  res.json({ code: 200, message: "Reply edited successfully." });
});

// /list
app.get("/list", (req, res) => {
  const totalQuestions = Object.keys(db.questions).length;
  const totalReplies = Object.values(db.questions).reduce((a, b) => a + b.length, 0);
  res.json({
    code: 200,
    totalQuestions,
    totalReplies,
    message: "List fetched successfully."
  });
});

app.listen(PORT, () => {
  console.log(`Custom Simsimi API running on port ${PORT}`);
});
