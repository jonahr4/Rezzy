'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithGoogle,
  signInWithApple,
  signUpWithEmail,
  sendPhoneCode,
  confirmPhoneCode,
} from '@/lib/firebase';
import type { ConfirmationResult } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name:            z.string().min(2, 'Enter your name'),
  email:           z.string().email('Enter a valid email'),
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Phone auth state
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const phoneBtnRef = useRef<HTMLButtonElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function waitForCookieThenRedirect() {
    const check = () => {
      if (document.cookie.includes('__session=')) {
        router.push('/onboarding');
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }

  async function onSubmit(data: FormData) {
    setError('');
    try {
      await signUpWithEmail(data.email, data.password);
      waitForCookieThenRedirect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else {
        setError('Could not create account. Please try again.');
      }
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      waitForCookieThenRedirect();
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    setAppleLoading(true);
    try {
      await signInWithApple();
      waitForCookieThenRedirect();
    } catch {
      setError('Apple sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleSendCode() {
    if (!phone.trim()) return;
    setError('');
    setPhoneLoading(true);
    try {
      const result = await sendPhoneCode(phone, 'btn-phone-send-signup');
      setConfirmation(result);
    } catch {
      setError('Could not send verification code. Check the number and try again.');
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!confirmation || !phoneCode.trim()) return;
    setError('');
    setPhoneLoading(true);
    try {
      await confirmPhoneCode(confirmation, phoneCode);
      waitForCookieThenRedirect();
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <img src="/logo.png" alt="Rezzy Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div>Rez<span>zy</span></div>
        </div>

        <div className="auth-title">Create your account</div>
        <div className="auth-subtitle">Start tailoring your resume for every role</div>

        {/* Social sign-up buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn btn-secondary w-full"
            style={{ justifyContent: 'center', gap: 10 }}
            id="btn-google-signup"
          >
            {googleLoading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={handleApple}
            disabled={appleLoading}
            className="btn btn-secondary w-full"
            style={{ justifyContent: 'center', gap: 10 }}
            id="btn-apple-signup"
          >
            {appleLoading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            )}
            Continue with Apple
          </button>

          <button
            onClick={() => setShowPhone(!showPhone)}
            className="btn btn-secondary w-full"
            style={{ justifyContent: 'center', gap: 10 }}
            id="btn-phone-toggle-signup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Continue with Phone
          </button>
        </div>

        {/* Phone auth expandable */}
        {showPhone && (
          <div style={{ marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!confirmation ? (
              <>
                <div className="input-group">
                  <label className="input-label" htmlFor="phone-number-signup">Phone number</label>
                  <input
                    id="phone-number-signup"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  id="btn-phone-send-signup"
                  ref={phoneBtnRef}
                  onClick={handleSendCode}
                  disabled={phoneLoading || !phone.trim()}
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  {phoneLoading ? (
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  ) : (
                    'Send code'
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label className="input-label" htmlFor="phone-code-signup">Verification code</label>
                  <input
                    id="phone-code-signup"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    className="input-field"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={phoneLoading || phoneCode.length < 6}
                  className="btn btn-primary w-full"
                  style={{ justifyContent: 'center' }}
                >
                  {phoneLoading ? (
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  ) : (
                    'Verify'
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label" htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              className={`input-field ${errors.name ? 'error' : ''}`}
              {...register('name')}
            />
            {errors.name && <span className="input-error">{errors.name.message}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`input-field ${errors.email ? 'error' : ''}`}
              {...register('email')}
            />
            {errors.email && <span className="input-error">{errors.email.message}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={`input-field ${errors.password ? 'error' : ''}`}
              {...register('password')}
            />
            {errors.password && <span className="input-error">{errors.password.message}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="input-error">{errors.confirmPassword.message}</span>}
          </div>

          {error && (
            <div className="alert alert-danger" style={{ padding: '10px 14px', fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center' }}
            id="btn-create-account"
          >
            {isSubmitting ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
