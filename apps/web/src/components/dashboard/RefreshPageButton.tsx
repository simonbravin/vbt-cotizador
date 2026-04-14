"use client";

import { useRouter } from "next/navigation";

type Props = {
  label: string;
  className?: string;
};

export function RefreshPageButton({ label, className }: Props) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={className}>
      {label}
    </button>
  );
}
