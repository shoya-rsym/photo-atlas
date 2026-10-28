"use client";

import { useEffect, useMemo, useState } from "react";
import PhotoGrid from "@/components/PhotoGrid";
import {
  EMPTY_FILTERS,
  getPrefectureOptions,
  getTagOptions,
  getYearOptions,
  searchPhotos,
  type SearchFilters,
} from "@/lib/search";
import { sortPhotosByDate } from "@/lib/photos";
import type { Photo } from "@/types";

type Props = { photos: Photo[] };

const fieldClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground";

export default function SearchView({ photos }: Props) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const tagId = new URLSearchParams(window.location.search).get("tag");
    if (tagId && getTagOptions().some((tag) => tag.id === tagId)) {
      setFilters((current) => ({ ...current, tagId }));
    }
  }, []);

  const sorted = useMemo(() => sortPhotosByDate(photos), [photos]);
  const results = useMemo(() => searchPhotos(sorted, filters), [sorted, filters]);
  const tagOptions = useMemo(() => getTagOptions(), []);
  const yearOptions = useMemo(() => getYearOptions(photos), [photos]);
  const prefectureOptions = useMemo(() => getPrefectureOptions(), []);

  const update = (patch: Partial<SearchFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  return (
    <div className="space-y-8">
      <form
        className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-sm font-medium text-muted">キーワード</span>
          <input
            type="search"
            value={filters.keyword}
            placeholder="タイトル・タグ・コメント・撮影地点名"
            className={fieldClass}
            onChange={(e) => update({ keyword: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">タグ</span>
          <select
            value={filters.tagId}
            className={fieldClass}
            onChange={(e) => update({ tagId: e.target.value })}
          >
            <option value="">すべて</option>
            {tagOptions.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">撮影年</span>
          <select
            value={filters.year}
            className={fieldClass}
            onChange={(e) => update({ year: e.target.value })}
          >
            <option value="">すべて</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">都道府県</span>
          <select
            value={filters.prefectureId}
            className={fieldClass}
            onChange={(e) => update({ prefectureId: e.target.value })}
          >
            <option value="">すべて</option>
            {prefectureOptions.map((prefecture) => (
              <option key={prefecture.id} value={prefecture.id}>
                {prefecture.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="rounded-lg border border-border bg-card px-4 py-2 hover:border-accent"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            条件をクリア
          </button>
        </div>
      </form>

      <section aria-live="polite">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Photo collection
          </p>
          <h2 className="mt-1 text-2xl font-bold">検索結果 {results.length} 件</h2>
        </div>
        {results.length === 0 ? (
          <p className="text-muted">該当する写真がありません</p>
        ) : (
          <PhotoGrid photos={results} showLocation />
        )}
      </section>
    </div>
  );
}
