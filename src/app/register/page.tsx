"use client";

import Link from "next/link";
import { Gauge, Mail, Lock, ArrowRight, Loader2, User } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      toast.error(error.message || "Failed to create account");
      setIsLoading(false);
      return;
    }

    toast.success("Account created successfully!");
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen w-full bg-[#09090b] text-[#e5e2e1] selection:bg-[#c8c5ca]/30 selection:text-[#c8c5ca] overflow-x-hidden">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 relative z-10">
        {/* Ambient background glow */}
        <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center opacity-10">
          <div className="w-[500px] h-[500px] bg-[#c8c5ca]/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-[400px] relative z-10">
          {/* Brand Header */}
          <div className="mb-10 flex flex-col items-start gap-4 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards]">
            <div className="w-12 h-12 rounded-xl bg-[#201f20] border border-[#3f3f46] flex items-center justify-center shadow-lg">
              <Gauge className="text-[#c8c5ca] w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">Create an account</h1>
              <p className="text-base text-[#a1a1aa]">Join PapanFokus to start collaborating.</p>
            </div>
          </div>

          {/* Register Form */}
          {isMounted ? (
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              {/* Name Input */}
              <div className="flex flex-col gap-2 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards] [animation-delay:100ms]">
                <label className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold" htmlFor="name">
                  Full Name
                </label>
                <div className="relative group" suppressHydrationWarning>
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] group-focus-within:text-[#c8c5ca] transition-colors w-5 h-5" />
                  <input
                    className="w-full bg-[#1c1b1c]/50 backdrop-blur-sm border border-[#3f3f46] rounded-lg text-[#e5e2e1] text-base pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c8c5ca]/50 focus:border-[#c8c5ca] focus:bg-[#201f20] transition-all duration-300 placeholder:text-[#3f3f46] shadow-inner disabled:opacity-50"
                    id="name"
                    placeholder="John Doe"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="flex flex-col gap-2 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards] [animation-delay:200ms]">
                <label className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold" htmlFor="email">
                  Work Email
                </label>
                <div className="relative group" suppressHydrationWarning>
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] group-focus-within:text-[#c8c5ca] transition-colors w-5 h-5" />
                  <input
                    className="w-full bg-[#1c1b1c]/50 backdrop-blur-sm border border-[#3f3f46] rounded-lg text-[#e5e2e1] text-base pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c8c5ca]/50 focus:border-[#c8c5ca] focus:bg-[#201f20] transition-all duration-300 placeholder:text-[#3f3f46] shadow-inner disabled:opacity-50"
                    id="email"
                    placeholder="name@company.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-2 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards] [animation-delay:300ms]">
                <label className="text-xs text-[#a1a1aa] uppercase tracking-wider font-semibold" htmlFor="password">
                  Password
                </label>
                <div className="relative group" suppressHydrationWarning>
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] group-focus-within:text-[#c8c5ca] transition-colors w-5 h-5" />
                  <input
                    className="w-full bg-[#1c1b1c]/50 backdrop-blur-sm border border-[#3f3f46] rounded-lg text-[#e5e2e1] text-base pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c8c5ca]/50 focus:border-[#c8c5ca] focus:bg-[#201f20] transition-all duration-300 placeholder:text-[#3f3f46] shadow-inner disabled:opacity-50"
                    id="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Primary Action */}
              <button
                className="w-full bg-[#c8c5ca] text-[#303033] text-base font-semibold rounded-lg px-4 py-3 mt-2 hover:bg-[#e4e1e6] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-[#c8c5ca]/20 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards] [animation-delay:400ms] disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign Up
                    <ArrowRight className="w-5 h-5 opacity-80 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#c8c5ca]" />
            </div>
          )}



          {/* Footer Links */}
          <div className="mt-12 flex flex-col gap-4 opacity-0 blur-[10px] translate-y-5 animate-[fadeSlideIn_0.8s_ease-out_forwards] [animation-delay:700ms]">
            <p className="text-sm text-[#a1a1aa] text-center">
              Already have an account?{" "}
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-[#c8c5ca] hover:text-[#e4e1e6] hover:underline transition-colors font-medium">
                Sign in
              </Link>
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-[#3f3f46]">
              <Link href="#" className="hover:text-[#a1a1aa] transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-[#a1a1aa] transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-[#a1a1aa] transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Hero Image & Testimonials */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#201f20] overflow-hidden border-l border-[#3f3f46]">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Abstract architectural geometric forms"
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity opacity-0 blur-[10px] translate-x-10 animate-[slideRightIn_1s_ease-out_forwards]"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9HkqXL_P2mA44mUqbYQPEOn2ItmyYarLi3FA67pzF9yAn5L8uHFkYaDhdTG5pUsd6VfX77HHCxm2kZkqa7o0pOWpFlpoCGj3mJj6TlDkRZJxKzLlUg4n4ocvJ3MsfTSzA92uKZrK7Y1ig9Jgi8klCIBd3YtD-itbxZcoO1VFuUCHZP2tt_K_DvZFXDslc5LPCxXQY1bKNLv05gc_y-3QEIF_y5xVWOZiv6mcyxjwIFh1fm9U_5Cot0-3FQeyGXNZDz7IlBdzZBTDw"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#141313]/80 via-[#141313]/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent"></div>
        </div>

        {/* Floating Testimonials Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-16">
          <div className="opacity-0 blur-[10px] translate-x-10 animate-[slideRightIn_1s_ease-out_forwards] [animation-delay:200ms] max-w-lg mt-8">
            <h2 className="text-5xl font-semibold leading-[1.1] tracking-tight text-[#e5e2e1] mb-6 drop-shadow-lg">
              Manage Tasks Together. <br />
              <span className="text-[#c8c5ca] font-bold">Synchronized Instantly.</span>
            </h2>
            <p className="text-lg text-[#c8c5cb] leading-relaxed">
              A real-time project management platform that eliminates overlapping work. Move your task cards, and let our system update your entire team's screens in milliseconds.
            </p>
          </div>


        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#c8c5ca]" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
