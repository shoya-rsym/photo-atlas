"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { LocationPreview } from "@/components/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted">
      地図を読み込み中...
    </div>
  ),
});

type BoundaryState = { failed: boolean };

class MapErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full items-center justify-center text-muted">
          地図を表示できません
        </div>
      );
    }
    return this.props.children;
  }
}

type Props = { items: LocationPreview[] };

export default function PrefectureMap({ items }: Props) {
  return (
    <div className="mt-6 h-64 overflow-hidden rounded-lg border border-border bg-card sm:h-96">
      <MapErrorBoundary>
        <LeafletMap items={items} />
      </MapErrorBoundary>
    </div>
  );
}
