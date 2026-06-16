'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/app/actions/auth';
import Image from 'next/image';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-[#1023FD] hover:bg-[#11B4D4] text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-[#1023FD]/10 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        'Sign In'
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080C1A] px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#1023FD]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#00EEF5]/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/ATS_logo.PNG"
            alt="Aetas Logo"
            width={64}
            height={64}
            className="h-16 w-auto object-contain shrink-0 mb-4"
            priority
          />
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            Aetas Global
          </h2>
          <p className="text-xs text-[#11B4D4]/60 font-semibold tracking-wider uppercase mt-1">
            Operations Portal & Schedulers
          </p>
        </div>

        <div className="bg-[#062E56] border border-[#11B4D4]/20 rounded-2xl p-8 shadow-xl shadow-black/30 backdrop-blur-md">
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-[#11B4D4]/60 uppercase tracking-wider">
                Operations Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="admin@aetasglobal.com"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#11B4D4]/20 bg-[#080C1A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00EEF5] focus:ring-1 focus:ring-[#00EEF5] transition-colors"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold text-[#11B4D4]/60 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#11B4D4]/20 bg-[#080C1A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00EEF5] focus:ring-1 focus:ring-[#00EEF5] transition-colors"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-medium">
            Authorized operations personnel only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
