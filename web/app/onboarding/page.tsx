'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ResumeParseResult } from '@/app/api/parse-resume/route';
import ResumeReviewModal from '@/components/ResumeReviewModal';
import type { ImportSelection } from '@/components/ResumeReviewModal';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  
  // 0 = Welcome/Upload, 1 = Uploading/Parsing, 2 = Review, 3 = Saving
    const [profileData, setProfileData] = useState({
    full_name: '', email: '', phone: '', location: '', linkedin: '', github: ''
  });
  const [step, setStep] = useState(0); 
  const [direction, setDirection] = useState('right');
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  
  const [reviewResult, setReviewResult] = useState<ResumeParseResult | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        setUser(u);
        try {
          const token = await u.getIdToken();
          const res = await fetch('/api/profile', {
            headers: { 'x-user-id': u.uid, 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfileData({
              full_name: data.full_name || '',
              email: data.email || u.email || '',
              phone: data.phone || '',
              location: data.location || '',
              linkedin: data.linkedin || '',
              github: data.github || ''
            });
          }
        } catch (e) {
          console.error('Failed to load profile', e);
        }
      }
      else router.push('/login');
    });
    return unsub;
  }, [router]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, []);

  async function handleUpload(files: FileList) {
    if (!user) return;
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf')).slice(0, 5);
    if (pdfs.length === 0) { setUploadError('Please select PDF files.'); return; }

    setDirection('right');
    setStep(2); // Move to loading step
    setUploadError('');
    setUploadProgress(10);
    setUploadStatus(`Extracting text from ${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}...`);

    try {
      const form = new FormData();
      for (const f of pdfs) form.append('file', f);

      setUploadProgress(25);
      setUploadStatus('Analyzing resume content. This takes a few seconds...');

      const token = await user.getIdToken();
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: {
          'x-user-id': user.uid,
          'Authorization': `Bearer ${token}`
        },
        body: form,
      });

      setUploadProgress(80);
      setUploadStatus('Checking for duplicates...');

      if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err.error ?? err.message ?? errMsg;
        } catch {
          // If it fails to parse JSON (e.g. 502 HTML from proxy)
          if (res.status === 502 || res.status === 504) {
            errMsg = 'The AI server took too long or is currently overloaded. Please try again.';
          } else {
            errMsg = 'An unexpected server error occurred (' + res.status + ').';
          }
        }
        throw new Error(errMsg);
      }
      const result: ResumeParseResult = await res.json();

      setUploadProgress(100);
      setUploadStatus('Done!');
      setReviewResult(result);
      
      // Move to review step
      setTimeout(() => {
        setDirection('right');
        setStep(3);
      }, 400);

    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      setDirection('left');
      setStep(1);
    }
  }

  async function handleSave(selection: ImportSelection) {
    if (!user) return;
    setDirection('right');
    setStep(4); // Saving
    setUploadStatus('Saving your Source Bank...');
    setUploadProgress(30);
    
    try {
      const token = await user.getIdToken();
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': user.uid,
        'Authorization': `Bearer ${token}`
      };

      
      // 0. Save Profile
      await fetch('/api/profile', { method: 'PUT', headers, body: JSON.stringify(profileData) });

      // 1. Save New Entries
      for (const entry of selection.entries) {
        await fetch('/api/entries', { method: 'POST', headers, body: JSON.stringify(entry) });
      }
      setUploadProgress(60);

      // 2. Save New Education
      for (const edu of selection.education) {
        await fetch('/api/education', { method: 'POST', headers, body: JSON.stringify(edu) });
      }

      // 3. Save Skills
      if (selection.skills.length > 0) {
        const sr = await fetch('/api/skills', { headers });
        const existing = await sr.json();
        const updated = Array.isArray(existing) ? [...existing] : [];
        const genIdx = updated.findIndex(g => g.label.toLowerCase() === 'general');
        if (genIdx >= 0) {
          updated[genIdx].skills = Array.from(new Set([...(updated[genIdx].skills || []), ...selection.skills]));
        } else {
          updated.push({ label: 'General', skills: selection.skills });
        }
        await fetch('/api/skills', { method: 'POST', headers, body: JSON.stringify({ groups: updated }) });
      }
      setUploadProgress(100);

      router.push('/dashboard');
    } catch (e) {
      setUploadError('Failed to save data. Please try again.');
      setDirection('left');
      setStep(3);
    }
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-topbar">
        <div className="landing-brand">Rez<span className="accent">zy</span></div>
      </div>
      <div className="onboarding-body">
        <div className="slide-container" style={{ paddingBottom: 32 }}>
          
          
          {/* Step 0: Profile Info */}
          {step === 0 && (
            <div className={`onboarding-card ${direction === 'right' ? 'slide-enter-right' : 'slide-enter-left'}`}>
              <h1 className="onboarding-title" style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>Let's set up your profile</h1>
              <p className="onboarding-desc" style={{ fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
                This is the standard contact information that will go at the top of your tailored resumes. You can change this later.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="input-field" placeholder="Jane Doe" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input type="email" className="input-field" placeholder="jane@example.com" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone Number (Optional)</label>
                  <input type="tel" className="input-field" placeholder="(555) 555-5555" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Location (Optional)</label>
                  <input type="text" className="input-field" placeholder="New York, NY" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">LinkedIn (Optional)</label>
                  <input type="text" className="input-field" placeholder="linkedin.com/in/janedoe" value={profileData.linkedin} onChange={e => setProfileData({...profileData, linkedin: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">GitHub / Portfolio (Optional)</label>
                  <input type="text" className="input-field" placeholder="github.com/janedoe" value={profileData.github} onChange={e => setProfileData({...profileData, github: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { setDirection('right'); setStep(1); }}
                  disabled={!profileData.full_name || !profileData.email}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Welcome & Upload */}
          {step === 1 && (
            <div className={`onboarding-card ${direction === 'right' ? 'slide-enter-right' : 'slide-enter-left'}`}>
              <h1 className="onboarding-title" style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>Seed your Source Bank</h1>
              <p className="onboarding-desc" style={{ fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
                The secret to perfectly tailored resumes is giving the AI a rich history to pull from. 
                Upload your resumes to extract your experience. The more the better!
              </p>

              <div 
                className="upload-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: isDragging ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: 16
                }}
              >
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files) handleUpload(e.target.files); }}
                />
                <div style={{ color: 'var(--accent)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Drag & Drop Resumes (PDFs)
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  or click to browse
                </p>
                <span className="badge" style={{ marginTop: 16, background: 'var(--accent-glow)' }}>Recommended</span>
              </div>

              {uploadError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{uploadError}</div>}

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={async () => {
                    try {
                      const token = await user?.getIdToken();
                      await fetch('/api/profile', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-user-id': user?.uid ?? '',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(profileData)
                      });
                    } catch(e) {}
                    router.push('/dashboard');
                  }}
                >
                  Skip & Add Manually Later
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Uploading/Parsing */}
          {(step === 2 || step === 4) && (
            <div className={`onboarding-card ${direction === 'right' ? 'slide-enter-right' : 'slide-enter-left'}`} style={{ textAlign: 'center', padding: '64px 32px' }}>
              <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 24px', borderColor: 'var(--accent)', borderRightColor: 'transparent' }} />
              <h1 className="onboarding-title" style={{ fontSize: 24, marginBottom: 16 }}>{uploadStatus}</h1>
              
              <div className="upload-progress-bar" style={{ width: '100%', maxWidth: 400, margin: '0 auto', background: 'var(--bg-secondary)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                <div 
                  className="upload-progress-fill" 
                  style={{ width: `${uploadProgress}%`, background: 'var(--accent)', height: '100%', transition: 'width 0.3s ease-out' }} 
                />
              </div>
            </div>
          )}

          {/* Step 2: Review Result */}
          {step === 3 && reviewResult && (
            <div className={`onboarding-card ${direction === 'right' ? 'slide-enter-right' : 'slide-enter-left'}`} style={{ maxWidth: 800, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '32px 32px 0' }}>
                <h1 className="onboarding-title" style={{ fontSize: 28, marginBottom: 8 }}>Here's what we found!</h1>
                <p className="onboarding-desc" style={{ fontSize: 15, marginBottom: 24 }}>
                  Review your extracted experience below. You can uncheck anything you don't want to import right now.
                  <br/><br/>
                  <strong style={{ color: 'var(--accent)' }}>Pro Tip:</strong> You can edit this further in the Source Bank later, and even add a custom <strong>Summary</strong> to each job to help the AI tailor more specific info!
                </p>
              </div>

              {/* Mount the actual review modal component inline, overriding some styles via css if needed */}
              <div className="onboarding-review-wrapper" style={{ position: 'relative', maxHeight: '60vh', overflowY: 'auto', background: 'var(--bg-primary)' }}>
                 <ResumeReviewModal 
                    result={reviewResult} 
                    onImport={handleSave} 
                    onClose={() => setStep(1)} 
                 />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
