"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
};

function Avatar({
    className,
    src,
    alt = "",
    fallback,
    size = "md",
    ...props
}: AvatarProps) {
    const [hasError, setHasError] = React.useState(false);

    // Reset error state when src changes
    React.useEffect(() => {
        setHasError(false);
    }, [src]);

    const renderFallback = () => {
        if (!fallback) return "?";
        if (typeof fallback !== "string") return fallback;

        return fallback
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {src && !hasError ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setHasError(true)}
                />
            ) : (
                <span className="flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground font-medium">
                    {renderFallback()}
                </span>
            )}
        </div>
    );
}

export { Avatar };
