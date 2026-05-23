// ─── Post Types (imported from usePosts) ──────────────────────────────────

export interface ReviewData {
  reviewId: string | null;
  placeName: string;
  placeType: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  visitDate: string | null;
}

export interface Post {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  type: 'blog' | 'auto' | 'review';
  content: any;
  tripId?: string;
  tripName?: string;
  tripProgress?: {
    locations: Array<{
      name: string;
      placeId: string;
      visitedAt: Date;
      photos: string[];
      isCurrentLocation: boolean;
    }>;
    currentLocationName: string;
    totalLocations: number;
    completionPercentage: number;
  };
  likesCount: number;
  commentsCount: number;
  reviewData?: ReviewData;
  isLiked?: boolean;
  _feedSource?: 'friends' | 'trending';
  createdAt: string;
  updatedAt: string;
}

// Alias for compatibility with backend docs
export type FeedPost = Post;

// ─── User Search Types ────────────────────────────────────────────────────

export interface UserSearchResult {
  _id: string;
  username: string;
  displayName: string;
  profileImage: string;
  isPrivate: boolean;
  // only present when isPrivate === false:
  bio?: string;
  travelStyle?: string[];
  xp?: number;
  level?: number;
  isFollowing?: boolean;
}

export interface UserSearchResponse {
  success: boolean;
  count: number;
  data: UserSearchResult[];
}

// ─── Public Profile Types ─────────────────────────────────────────────────

export interface ProfileStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PublicProfile {
  _id: string;
  username: string;
  displayName: string;
  profileImage: string;
  coverImage?: string;
  bio?: string;
  travelStyle?: string[];
  xp?: number;
  level?: number;
  isPrivate: boolean;
  isOwnProfile: boolean;
  isFollowing: boolean;
  // only when isPrivate === false:
  stats?: ProfileStats;
  recentPosts?: FeedPost[];
  privacy?: {
    publicProfile: boolean;
    showTripHistory: boolean;
    showReviewsPublicly: boolean;
  };
}

export interface PublicProfileResponse {
  success: boolean;
  data: PublicProfile;
}

// ─── Search History Types ─────────────────────────────────────────────────

export interface SearchHistoryEntry {
  _id: string;       // history entry ID — use this for DELETE /:entryId
  query: string;     // search term used when the user was clicked
  updatedAt: string;
  user: {
    _id: string;
    username: string;
    displayName: string;
    profileImage: string;
  };
}

export interface SearchHistoryResponse {
  success: boolean;
  count: number;
  data: SearchHistoryEntry[];
}
