import PhotoThumbnail from "@/components/PhotoThumbnail";
import type { PreviewInfo, PreviewPhoto } from "@/types";

type Props = {
  preview: PreviewInfo;
  /** 表示する写真（呼び出し側でランダム抽出済み） */
  photos: PreviewPhoto[];
  showLocationCount?: boolean;
};

export default function PreviewCard({
  preview,
  photos,
  showLocationCount = true,
}: Props) {
  return (
    <div>
      <p className="text-lg font-bold">{preview.name}</p>
      <p className="mt-1 text-sm text-muted">
        写真 {preview.photoCount} 枚
        {showLocationCount ? ` / 撮影地点 ${preview.locationCount} 件` : ""}
      </p>
      {photos.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-1.5">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="aspect-[4/3] overflow-hidden rounded bg-border"
            >
              <PhotoThumbnail src={photo.thumbnail} alt={photo.title} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">写真が登録されていません</p>
      )}
    </div>
  );
}
