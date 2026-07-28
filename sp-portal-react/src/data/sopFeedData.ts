/**
 * Port of sp-portal/sop-feed/sop-feed.js's data layer (DHL_POSTS / MOCK_POSTS /
 * loadCompanyPosts / saveCompanyPosts / getFeedPosts). DHL posts come from
 * window.DHL_MOCK_DATA.sopPosts (see dhl-mock-data.js, already loaded as a
 * side effect by dhlMockData.ts); the SP's own "company feed" posts persist
 * to localStorage under the same key the static site used, so switching
 * between the legacy app and this SPA during rollout keeps the same data.
 */
import { getMockData } from './dhlMockData';
import { MEDIA_INDEX } from './mediaIndex';

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
    title: 'DHL Training Basics',
    content: 'Complete DHL onboarding and training overview. Learn the fundamentals of our operations and safety protocols.',
    video: null,
    image: null,
    youtubeVideoId: 'dQw4w9WgXcQ',
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
    title: 'Safe Driving Procedures',
    content: 'Essential safe driving techniques and best practices. Follow these guidelines to ensure your safety and the safety of others on the road.',
    image: null,
    video: null,
    youtubeVideoId: 'jNQXAC9IVRw',
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
    type: 'tutorial',
    title: 'Package Handling 101',
    content: 'Proper package handling and protection methods to ensure parcels arrive in perfect condition.',
    image: null,
    video: null,
    youtubeVideoId: '9bZkp7q19f0',
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
    title: 'Warehouse Safety',
    content: 'Complete warehouse safety protocols and equipment usage guidelines. Your safety is our top priority.',
    image: null,
    video: null,
    youtubeVideoId: 'xfY6SEb6m7E',
    likes: 67,
    comments: 5,
    liked: true,
    commentList: [],
  },
  {
    id: 4,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '4 days ago',
    type: 'tutorial',
    title: 'Customer Service Excellence',
    content: 'Learn how to deliver exceptional customer service in every interaction. Building relationships is key to our success.',
    image: null,
    video: null,
    youtubeVideoId: 'aqz-KE-bpKQ',
    likes: 38,
    comments: 7,
    liked: false,
    commentList: [],
  },
  {
    id: 5,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '5 days ago',
    type: 'info',
    title: 'Route Optimization Strategies',
    content: 'Maximize efficiency through optimal route planning. Every minute counts in our fast-paced delivery environment.',
    image: null,
    video: null,
    youtubeVideoId: 'kJQDvkKd5OI',
    likes: 52,
    comments: 9,
    liked: false,
    commentList: [],
  },
  {
    id: 6,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '6 days ago',
    type: 'update',
    title: 'DHL eCommerce Opens First Carbon-Neutral Site in UK',
    content: 'DHL eCommerce unveiled its inaugural operationally carbon-neutral facility in Camberley, England. The site operates almost entirely by solar energy and achieved an A+ Energy Performance Certificate rating through renewable generation and IoT technology.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 76,
    comments: 14,
    liked: false,
    commentList: [],
  },
  {
    id: 7,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '1 week ago',
    type: 'update',
    title: 'DHL Acquires Volvo Heavy-Duty Electric Trucks',
    content: 'DHL Supply Chain became the first UK company to operate four 40-tonne Volvo FM fully electric HGVs. These zero-emissions vehicles directly replace diesel trucks for deliveries and offer up to 180 miles of range per charge.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 68,
    comments: 11,
    liked: false,
    commentList: [],
  },
  {
    id: 8,
    author: 'DHL Uk',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '2 weeks ago',
    type: 'info',
    title: 'DHL Launches Sustainable Parcel Delivery by Boat',
    content: 'DHL Express has introduced a daily riverboat parcel delivery service operating via Thames Clippers Logistics. This innovative multi-modal approach combines electric vehicles, high-speed riverboat transit, and final-mile courier bicycles to reduce London\'s traffic congestion.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 55,
    comments: 8,
    liked: false,
    commentList: [],
  },
  {
    id: 9,
    author: 'DHL Global',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '3 weeks ago',
    type: 'update',
    title: 'DHL Delivers New Deal for European Rugby',
    content: 'DHL Express has secured a partnership as an official sponsor of the Heineken Champions Cup and EPCR Challenge Cup, providing customized logistics solutions for both tournaments. This expansion strengthens DHL\'s sports sponsorships portfolio.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 43,
    comments: 6,
    liked: false,
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
