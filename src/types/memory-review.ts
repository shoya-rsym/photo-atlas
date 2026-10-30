export type MemoryRating = "A" | "B" | "C" | "NG";

type MemoryReviewBase = {
  id: string;
  text: string;
  rating: MemoryRating;
  memo?: string;
  createdAt: string;
  reviewedAt: string;
  locationId: string;
  locationName: string;
};

export type SessionMemoryReview = MemoryReviewBase & {
  memoryType?: "session";
  sessionMemoryId: string;
  sessionDate: string;
};

export type FavoriteMemoryReview = MemoryReviewBase & {
  memoryType: "favorite";
  photoId: string;
  photoTitle: string;
  sessionDate?: string;
};

export type MemoryReview = SessionMemoryReview | FavoriteMemoryReview;
