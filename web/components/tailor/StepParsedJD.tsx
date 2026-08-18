"use client";

import { useEffect, useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";

const API_URL = "/api/pipeline/step";

export default function StepParsedJD() {
  const {
    parsedJD,
    loading,
    loadingMessage,
    setLoading,
    setSkillsData,
    advanceStep,
  } = useTailorStore();

  const [skillsReady, setSkillsReady] = useState(false);

  // Fetch skills data when parsed JD is available, but DON'T auto-advance
  useEffect(() => {
    if (!parsedJD || loading || skillsReady) return;

    const timer = setTimeout(async () => {
      setLoading(true, "Organizing skills for this role...");
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "skills",
            parsed_jd: parsedJD,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSkillsData(data.skill_rows, data.available_skills, data.suggested_skills);
        setSkillsReady(true);
      } catch (err) {
        console.error("Skills step failed:", err);
      } finally {
        setLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedJD]);

  if (!parsedJD && loading) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  if (!parsedJD) return null;

  return (
    <div className="step-inner step-parsed">
      <div className="step-content-centered">
        <div className="parsed-badge">JD Analyzed</div>
        <h2 className="parsed-company">{parsedJD.company_name}</h2>
        <h3 className="parsed-role">{parsedJD.role_title}</h3>
        <div className="parsed-seniority">
          <span className="seniority-badge">{parsedJD.seniority}</span>
        </div>

        <div className="parsed-section">
          <div className="parsed-label">Required Skills</div>
          <div className="parsed-chips">
            {parsedJD.required_skills.map((s, i) => (
              <span key={i} className="parsed-chip required">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="parsed-section">
          <div className="parsed-label">Nice to Have</div>
          <div className="parsed-chips">
            {parsedJD.nice_to_have_skills.map((s, i) => (
              <span key={i} className="parsed-chip nice">
                {s}
              </span>
            ))}
          </div>
        </div>

        {loading && (
          <div className="parsed-loading">
            <div className="loading-spinner small" />
            <span>{loadingMessage}</span>
          </div>
        )}

        {/* Show continue button when skills data is ready */}
        {skillsReady && !loading && (
          <button
            className="step-cta"
            onClick={advanceStep}
            style={{ marginTop: 28 }}
          >
            Continue to Skills →
          </button>
        )}
      </div>
    </div>
  );
}
