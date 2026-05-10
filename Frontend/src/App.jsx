import { useState, useRef } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const handleSubmit = async () => {
    if (!file || !jd) {
      alert("Please upload resume and add JD");
      return;
    }

    setLoading(true);
    setData(null);
    setStep("Parsing resume...");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jd", jd);

      const apiCall = await axios.post(
        "https://ai-resume-jd-matcher-backend.onrender.com/analyze",
        formData,
      );

      await sleep(700);
      setStep("Matching skills...");

      await sleep(700);
      setStep("Generating AI suggestions...");

      const res = await apiCall;

      setData(res.data);
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
        AI Resume Matcher
      </h1>

      {/* INPUT CARD */}
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/20">
        <input
          type="file"
          className="mb-4 w-full text-sm file:mr-4 file:py-2 file:px-4 
             file:rounded-lg file:border-0 
             file:text-sm file:font-semibold 
             file:bg-blue-50 file:text-blue-700 
             hover:file:bg-blue-100 
             file:cursor-pointer cursor-pointer"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <textarea
          rows="6"
          placeholder="Paste Job Description..."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 
             disabled:bg-gray-500 transition-all py-2 rounded-lg font-semibold"
        >
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
        {loading && (
          <div className="mt-6 flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>

            {/* Step Text */}
            <p className="text-lg text-indigo-300 font-medium animate-pulse">
              {step}
            </p>
          </div>
        )}
      </div>

      {/* RESULT SECTION */}
      {data && (
        <div className="w-full max-w-4xl mt-8 space-y-6">
          {/* SCORE CARD */}
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/20">
            <h2 className="text-xl font-semibold mb-2">Match Score</h2>

            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className="bg-green-400 h-4 rounded-full"
                style={{ width: `${data.score}%` }}
              />
            </div>

            <p className="mt-2 text-lg font-bold">{data.score}%</p>
          </div>

          {/* SKILLS */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* MATCHED */}
            <div className="bg-white/10 p-5 rounded-xl border border-green-400/30">
              <h3 className="text-green-400 font-semibold mb-3">
                Matched Skills
              </h3>

              <div className="flex flex-wrap gap-2">
                {data.matchedSkills.map((s, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-500/20 rounded-full text-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* MISSING */}
            <div className="bg-white/10 p-5 rounded-xl border border-red-400/30">
              <h3 className="text-red-400 font-semibold mb-3">
                Missing Skills
              </h3>

              <div className="flex flex-wrap gap-2">
                {data.missingSkills.map((s, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-red-500/20 rounded-full text-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI SUGGESTIONS */}
          <div className="bg-white/10 p-6 rounded-2xl border border-indigo-400/30">
            <h3 className="text-indigo-400 font-semibold mb-3">
              AI Suggestions
            </h3>

            <ul className="list-disc pl-5 space-y-2">
              {data.ai.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
