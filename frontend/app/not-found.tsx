import { Activity } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Activity className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-6xl font-bold text-foreground">404</h1>
                <p className="mt-2 text-lg text-muted-foreground">Page not found</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                    The page you are looking for does not exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                >
                    Back to home
                </Link>
            </div>
        </div>
    );
}
