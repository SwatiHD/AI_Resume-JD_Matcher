const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
require("dotenv").config();
const axios = require("axios");

const natural = require("natural");
const sw = require("stopword");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer();

// -----------------------------
// TEXT PROCESSING
// -----------------------------

function preprocess(text) {
  const tokenizer = new natural.WordTokenizer();
  let tokens = tokenizer.tokenize(text.toLowerCase());

  tokens = sw.removeStopwords(tokens);
  return tokens;
}

// ----------------------------
// COSINE SIMILARITY
// -----------------------------

function getVector(tokens) {
  const freq = {};
  tokens.forEach((t) => {
    freq[t] = (freq[t] || 0) + 1;
  });
  return freq;
}

function cosineSimilarity(vecA, vecB) {
  const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  let dot = 0,
    magA = 0,
    magB = 0;

  allWords.forEach((word) => {
    const a = vecA[word] || 0;
    const b = vecB[word] || 0;

    dot += a * b;
    magA += a * a;
    magB += b * b;
  });

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// -----------------------------
// SKILL EXTRACTION
// -----------------------------

const SKILLS_DB = [
  // frontend
  "javascript",
  "typescript",
  "react",
  "next",
  "next.js",
  "redux",
  "html",
  "css",
  "tailwind",
  "bootstrap",

  // backend
  "node",
  "express",
  "mongodb",
  "sql",
  "mysql",

  // tools
  "git",
  "docker",
  "aws",
  "firebase",

  // concepts
  "rest",
  "api",
  "graphql",
  "microservices",
];

function extractSkills(text) {
  const lower = text.toLowerCase();
  return SKILLS_DB.filter((skill) => lower.includes(skill));
}

// -----------------------------
// AI SUGGESTIONS (LLM)
// -----------------------------
const USE_AI = false;
async function getAISuggestions(resume, jd) {
  if (!USE_AI) {
    return {
      improvements: [
        "Add more relevant skills from the job description",
        "Highlight project impact with measurable results",
        "Include React, API integration, and real-world projects",
      ],
      missingSkills: [],
      summary: "AI disabled (using fallback)",
    };
  }
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Give resume improvements for this JD`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
    );

    return {
      improvements: [response.data.choices[0].message.content],
      missingSkills: [],
      summary: "AI generated",
    };
  } catch (err) {
    console.error("⚠️ OpenAI Error:", err.response?.status);

    // ✅ fallback (IMPORTANT)
    return {
      improvements: [
        "Add more relevant skills from JD",
        "Highlight project impact",
        "Include measurable achievements",
      ],
      missingSkills: [],
      summary: "Fallback response (AI unavailable)",
    };
  }
}

// -----------------------------
// MAIN API
// -----------------------------

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file missing" });
    }
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;
    const jdText = req.body.jd;

    // NLP Processing
    const resumeTokens = preprocess(resumeText);
    const jdTokens = preprocess(jdText);

    const vecA = getVector(resumeTokens);
    const vecB = getVector(jdTokens);

    const similarity = cosineSimilarity(vecA, vecB);

    // Skill Matching
    const resumeSkills = extractSkills(resumeText);
    console.log("Resume Skills:", resumeSkills);
    const jdSkills = extractSkills(jdText);
    console.log("JD Skills:", jdSkills);
    const matchedSkills = jdSkills.filter((s) => resumeSkills.includes(s));

    const missingSkills = jdSkills.filter((s) => !resumeSkills.includes(s));

    const skillScore = (matchedSkills.length / (jdSkills.length || 1)) * 100;

    // AI Suggestions
    const aiData = await getAISuggestions(resumeText, jdText);

    res.json({
      score: Math.round((similarity * 0.6 + (skillScore / 100) * 0.4) * 100),
      similarity: similarity.toFixed(2),
      skillScore: skillScore.toFixed(2),
      matchedSkills,
      missingSkills,
      ai: aiData,
    });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.listen(5000, () => console.log("Server running on 5000"));
