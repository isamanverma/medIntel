"use client";

import { Activity } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                    <Activity className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                    Something went wrong
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    {error.message || "An unexpected error occurred. Please try again."}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
