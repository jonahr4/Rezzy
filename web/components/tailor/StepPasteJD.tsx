"use client";

import { useTailorStore } from "@/lib/tailorStore";
import { useAuth } from "@/lib/auth-context";

const API_URL = "/api/pipeline/step";

export default function StepPasteJD() {
  const { jdText, setJdText, setLoading, setParsedJD, advanceStep, setRunId } =
    useTailorStore();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!jdText.trim()) return;
    setLoading(true, "Parsing job description...");
    advanceStep();

    try {
      // Create run record in DB first
      const runRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-user-id": user.uid } : {}),
        },
        body: JSON.stringify({ jd_text: jdText }),
      });
      if (runRes.ok) {
        const runData = await runRes.json();
        setRunId(runData.id);
      }

      // Parse the JD
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "parse-jd", jd_text: jdText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedJD(data.parsed_jd);

      // Update run with parsed JD info (company, role, parsed_jd)
      const { runId } = useTailorStore.getState();
      if (runId && user?.uid) {
        fetch(`/api/pipeline/${runId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-id": user.uid },
          body: JSON.stringify({
            company: data.parsed_jd?.company_name ?? null,
            role: data.parsed_jd?.role_title ?? null,
            parsed_jd: data.parsed_jd,
            status: "running",
          }),
        });
      }
    } catch (err) {
      console.error("Parse JD failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-inner step-paste">
      <div className="step-content-centered">
        <h1 className="step-headline">
          Paste your <span className="accent">job description</span>
        </h1>
        <p className="step-subtitle">
          We&apos;ll analyze the role and tailor your resume to match.
        </p>
        <div className="jd-textarea-wrap">
          <textarea
            className="jd-textarea"
            placeholder="Paste the full job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={14}
          />
          <div className="jd-char-count">
            {jdText.length.toLocaleString()} characters
          </div>
        </div>
        <button
          className="step-cta"
          onClick={handleSubmit}
          disabled={!jdText.trim()}
        >
          Tailor My Resume →
        </button>
      </div>
    </div>
  );
}
