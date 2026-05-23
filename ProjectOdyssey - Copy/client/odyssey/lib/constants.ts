// Social Feed Configuration Constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
};

// Pagination Configuration
export const PAGINATION = {
  POSTS_PER_PAGE: 10,
  COMMENTS_PER_PAGE: 20,
  LIKES_PER_PAGE: 20,
};

// Content Limits
export const CONTENT_LIMITS = {
  COMMENT_MAX_LENGTH: 500,
  POST_PREVIEW_LENGTH: 200,
  TRIP_NAME_MAX_LENGTH: 100,
};

// UI Configuration
export const UI_CONFIG = {
  SCROLL_THRESHOLD: 0.1, // For infinite scroll
  DROPDOWN_DELAY: 200, // milliseconds
  ANIMATION_DURATION: 300, // milliseconds
};

// Time Formatting
export const TIME_FORMAT = {
  SECONDS_IN_MINUTE: 60,
  SECONDS_IN_HOUR: 3600,
  SECONDS_IN_DAY: 86400,
  SECONDS_IN_WEEK: 604800,
};
