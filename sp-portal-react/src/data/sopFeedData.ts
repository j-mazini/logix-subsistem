/**
 * Port of sp-portal/sop-feed/sop-feed.js's data layer (DHL_POSTS / MOCK_POSTS /
 * loadCompanyPosts / saveCompanyPosts / getFeedPosts). DHL posts come from
 * window.DHL_MOCK_DATA.sopPosts (see dhl-mock-data.js, already loaded as a
 * side effect by dhlMockData.ts); the SP's own "company feed" posts persist
 * to localStorage under the same key the static site used, so switching
 * between the legacy app and this SPA during rollout keeps the same data.
 */
import { getMockData } from './dhlMockData';

export type SopPostType = 'tutorial' | 'update' | 'info';
export type SopSource = 'dhl' | 'company';
export type SopAudience = 'drivers' | 'company';

export interface SopComment {
  author: string;
  company?: string;
  authorAvatar: string;
  text: string;
  timeAgo: string;
}

export interface SopPost {
  id: number;
  author: string;
  authorAvatar: string;
  timeAgo: string;
  type: SopPostType;
  title: string;
  content: string;
  video?: string | null;
  image?: string | null;
  youtubeVideoId?: string | null;
  likes: number;
  comments: number;
  liked: boolean;
  commentList: SopComment[];
  source: SopSource;
  audience: SopAudience;
  sharedFromDhlId?: number | null;
}

interface RawSopPost {
  id: number;
  author: string;
  authorAvatar: string;
  timeAgo: string;
  type: string;
  title: string;
  content: string;
  video?: string | null;
  image?: string | null;
  youtubeVideoId?: string | null;
  likes: number;
  comments: number;
  liked: boolean;
  commentList?: { author: string; company?: string; authorAvatar: string; text: string; timeAgo: string }[];
}

const STORAGE_KEY = 'dhl_sp_company_feed_posts';

/**
 * Fallback DHL posts, ported from sop-feed.js's own inline fallback array —
 * used only if window.DHL_MOCK_DATA.sopPosts is ever empty/missing (in
 * practice it never is: dhl-mock-data.js always defines SOP_POSTS).
 */
const FALLBACK_DHL_POSTS: RawSopPost[] = [
  {
    id: 0,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '1 hour ago',
    type: 'tutorial',
    title: 'DHL Training Video',
    content: 'Watch the DHL training video directly on the platform.',
    video: 'assets/videos/dhl-training-1.mp4',
    image: null,
    youtubeVideoId: null,
    likes: 15,
    comments: 3,
    liked: false,
    commentList: [{ author: 'James T.', company: 'TBX', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Really clear video, thanks.', timeAgo: '50 min ago' }],
  },
  {
    id: 1,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '2 hours ago',
    type: 'tutorial',
    title: 'Safe Loading Procedures',
    content: 'Updated tutorial for safe loading and unloading of parcels.',
    image: 'assets/sop-dhl-truck-london.png',
    video: null,
    youtubeVideoId: null,
    likes: 24,
    comments: 8,
    liked: false,
    commentList: [],
  },
  {
    id: 2,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '1 day ago',
    type: 'update',
    title: 'New Depot Hours – MSE & LCY',
    content: 'Effective from next Monday, MSE and LCY depots will operate extended hours.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 42,
    comments: 12,
    liked: false,
    commentList: [],
  },
  {
    id: 3,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '3 days ago',
    type: 'info',
    title: 'Time Window (TW) Compliance Reminder',
    content: 'Please ensure all deliveries are completed within the agreed time windows.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 67,
    comments: 5,
    liked: true,
    commentList: [],
  },
];

function defaultCompanyPosts(): SopPost[] {
  return [
    {
      id: 1001,
      author: 'TBX Admin',
      authorAvatar: 'assets/atlas-transport-logo.png',
      timeAgo: '10 min ago',
      type: 'update',
      title: 'Driver reminder: route changes this week',
      content: 'Please review the updated route plan before your next shift. We will publish changes directly here.',
      video: null,
      image: null,
      youtubeVideoId: null,
      likes: 4,
      comments: 1,
      liked: false,
      commentList: [{ author: 'Mina', company: 'TBX', authorAvatar: 'assets/atlas-transport-logo.png', text: 'Thanks for the reminder.', timeAgo: '5 min ago' }],
      source: 'company',
      audience: 'drivers',
    },
    {
      id: 1002,
      author: 'TBX Admin',
      authorAvatar: 'assets/atlas-transport-logo.png',
      timeAgo: '1 hour ago',
      type: 'info',
      title: 'Shared DHL guidance: time window compliance',
      content: 'This update was shared to your drivers from DHL guidance to keep everyone aligned.',
      video: null,
      image: null,
      youtubeVideoId: null,
      likes: 2,
      comments: 0,
      liked: false,
      commentList: [],
      source: 'company',
      audience: 'company',
      sharedFromDhlId: 3,
    },
  ];
}

export function loadCompanyPosts(): SopPost[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored && Array.isArray(stored) && stored.length) return stored as SopPost[];
  } catch {
    /* ignore */
  }
  return defaultCompanyPosts();
}

export function saveCompanyPosts(posts: SopPost[]) {
  const companyPosts = posts.filter((p) => p.source === 'company');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companyPosts));
  } catch {
    /* ignore */
  }
}

export function getDhlPosts(): SopPost[] {
  const data = getMockData() as { sopPosts?: RawSopPost[] } | undefined;
  const raw = data && Array.isArray(data.sopPosts) && data.sopPosts.length ? data.sopPosts : FALLBACK_DHL_POSTS;
  return raw.map((p) => ({
    id: p.id,
    author: p.author,
    authorAvatar: p.authorAvatar,
    timeAgo: p.timeAgo,
    type: (p.type as SopPostType) || 'info',
    title: p.title,
    content: p.content,
    video: p.video ?? null,
    image: p.image ?? null,
    youtubeVideoId: p.youtubeVideoId ?? null,
    likes: p.likes,
    comments: p.comments,
    liked: p.liked,
    commentList: (p.commentList || []).map((c) => ({ author: c.author, company: c.company, authorAvatar: c.authorAvatar, text: c.text, timeAgo: c.timeAgo })),
    source: 'dhl',
    audience: 'company',
  }));
}

/** Port of sop-feed.js's ASSET() helper: rewrites the mock data's `assets/...` paths. */
export function assetPath(path: string | null | undefined): string {
  return path ? path.replace(/^assets\//, '/assets/') : '';
}
