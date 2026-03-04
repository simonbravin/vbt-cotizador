"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/translations";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Signup failed. Please try again.");
        return;
      }
      router.push("/pending");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { id: "name" as const, labelKey: "auth.fullName", type: "text", placeholder: "John Smith" },
    { id: "email" as const, labelKey: "auth.email", type: "email", placeholder: "you@company.com" },
    { id: "password" as const, labelKey: "auth.password", type: "password", placeholder: "Min 8 chars" },
    { id: "confirmPassword" as const, labelKey: "auth.confirmPassword", type: "password", placeholder: "Repeat password" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-vbt-blue to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center rounded-lg border border-white/20 overflow-hidden text-xs font-medium">
            {(["en", "es"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-3 py-1.5 transition-colors ${
                  locale === l ? "bg-white text-vbt-blue" : "text-white/70 hover:text-white"
                }`}
              >
                {l === "en" ? "ENG" : "ESP"}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-vbt-white.png"
              alt="Vision Building Technologies"
              width={240}
              height={56}
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">VBT Cotizador</h1>
          <p className="text-slate-300 mt-1 text-sm">Vision Building Technologies</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{t("auth.createAccount")}</h2>
          <p className="text-sm text-gray-500 mb-6">{t("auth.createAccountSub")}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(({ id, labelKey, type, placeholder }) => (
              <div key={id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(labelKey)}
                </label>
                <input
                  {...register(id)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vbt-blue focus:border-transparent"
                />
                {errors[id] && (
                  <p className="mt-1 text-xs text-red-600">{errors[id]?.message}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-vbt-blue hover:bg-blue-900 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? t("auth.requestingAccess") : t("auth.requestAccessBtn")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t("auth.alreadyAccount")}{" "}
              <Link href="/login" className="text-vbt-orange hover:underline font-medium">
                {t("auth.signInLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
