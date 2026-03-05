import Link from "next/link";
import {
  Activity,
  Brain,
  FileText,
  Shield,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  Sparkles,
  Lock,
  BarChart3,
} from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Diagnostics",
    description:
      "Advanced machine learning models analyze symptoms and medical history to provide intelligent diagnostic suggestions.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: FileText,
    title: "Smart Health Records",
    description:
      "Upload and manage medical documents with automatic extraction, categorization, and intelligent summarization.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: BarChart3,
    title: "Predictive Analytics",
    description:
      "Risk scoring and predictive models help identify potential health concerns before they become critical.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Lock,
    title: "HIPAA Compliant",
    description:
      "Enterprise-grade security with end-to-end encryption ensures your sensitive health data stays protected.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "50k+", label: "Records Processed" },
  { value: "<2s", label: "Avg Response Time" },
  { value: "256-bit", label: "Encryption" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-40 -left-40 h-[300px] w-[400px] rounded-full bg-secondary/5 blur-3xl" />
            <div className="absolute top-60 -right-40 h-[300px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm shadow-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  AI-Powered Healthcare Intelligence
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Smarter Healthcare,{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Better Outcomes
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                MedIntel combines artificial intelligence with clinical
                expertise to transform how patients and doctors interact with
                health data. Faster diagnostics, proactive insights, and
                seamless care.
              </p>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/signup?role=patient"
                  className="group flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
                >
                  <HeartPulse className="h-5 w-5" />
                  Get Started as Patient
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/signup?role=doctor"
                  className="group flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-secondary hover:bg-secondary/5"
                >
                  <Stethoscope className="h-5 w-5 text-secondary" />
                  Join as Doctor
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
                </Link>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-foreground sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-border bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Activity className="h-3.5 w-3.5" />
                Platform Features
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need for intelligent care
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Built for both patients and healthcare providers, MedIntel
                delivers AI-driven tools that make a real difference.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                  >
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} transition-transform group-hover:scale-110`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t border-border py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How MedIntel works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three simple steps to smarter healthcare management.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create Your Account",
                  description:
                    "Sign up as a patient or doctor. It takes less than a minute to get started.",
                  color: "bg-primary",
                },
                {
                  step: "02",
                  title: "Upload Your Data",
                  description:
                    "Import medical records, lab results, and health documents securely.",
                  color: "bg-secondary",
                },
                {
                  step: "03",
                  title: "Get AI Insights",
                  description:
                    "Receive personalized health insights, risk assessments, and recommendations.",
                  color: "bg-accent",
                },
              ].map((item) => (
                <div key={item.step} className="relative text-center">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} text-white text-lg font-bold shadow-lg`}
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-lg sm:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground sm:text-3xl">
                Ready to get started?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Join thousands of patients and healthcare professionals already
                using MedIntel to make smarter health decisions.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup?role=patient"
                  className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg"
                >
                  <HeartPulse className="h-4 w-4" />
                  Sign Up Free
                </Link>
                <Link
                  href="/login?role=doctor"
                  className="flex h-11 items-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold text-foreground transition-all hover:bg-muted"
                >
                  <Stethoscope className="h-4 w-4 text-secondary" />
                  Doctor Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
