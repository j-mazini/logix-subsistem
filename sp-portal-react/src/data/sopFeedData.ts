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

// Google Drive image URLs
const GD_IMAGES = {
  truck_london: 'https://lh3.googleusercontent.com/d/1K2J3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7=w800',
  training_procedures: 'https://lh3.googleusercontent.com/d/2A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P=w800',
  safety_equipment: 'https://lh3.googleusercontent.com/d/3Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F=w800',
  route_map: 'https://lh3.googleusercontent.com/d/4G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V=w800',
  delivery_checkpoint: 'https://lh3.googleusercontent.com/d/5W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L=w800',
  vehicle_inspection: 'https://lh3.googleusercontent.com/d/6M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B=w800',
  compliance_checklist: 'https://lh3.googleusercontent.com/d/7C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R=w800',
};

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
  {
    id: 10,
    author: 'DHL Operations',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '4 weeks ago',
    type: 'tutorial',
    title: 'Peak Season Preparation Guide 2024',
    content: 'Comprehensive guide to preparing for peak season delivery surge. Learn about resource allocation, staff training, and volume forecasting strategies to handle holiday season demands.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 89,
    comments: 22,
    liked: false,
    commentList: [],
  },
  {
    id: 11,
    author: 'DHL Training',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '5 weeks ago',
    type: 'tutorial',
    title: 'Advanced Parcel Sorting Techniques',
    content: 'Master the art of efficient parcel sorting. This tutorial covers modern sorting methods, barcode scanning best practices, and techniques to minimize handling damage.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 64,
    comments: 15,
    liked: false,
    commentList: [],
  },
  {
    id: 12,
    author: 'DHL Safety',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '6 weeks ago',
    type: 'info',
    title: 'Workplace Injury Prevention Campaign',
    content: 'Latest workplace safety statistics and injury prevention strategies. Focus on proper lifting techniques, ergonomics, and hazard awareness to keep our team safe.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 57,
    comments: 10,
    liked: false,
    commentList: [],
  },
  {
    id: 13,
    author: 'DHL Technology',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '7 weeks ago',
    type: 'update',
    title: 'New Delivery Tracking App Features',
    content: 'Introducing enhanced real-time tracking capabilities. Customers can now get live GPS updates, estimated delivery windows, and direct driver communication through our new mobile app.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 71,
    comments: 18,
    liked: false,
    commentList: [],
  },
  {
    id: 14,
    author: 'DHL Sustainability',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '8 weeks ago',
    type: 'info',
    title: 'Green Initiative: Sustainable Packaging',
    content: 'DHL commits to sustainable packaging solutions. Learn about our transition to eco-friendly materials and how packaging innovations reduce environmental impact while maintaining protection.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 82,
    comments: 19,
    liked: false,
    commentList: [],
  },
  {
    id: 15,
    author: 'DHL Customer Service',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '9 weeks ago',
    type: 'tutorial',
    title: 'Handling Difficult Customer Interactions',
    content: 'Professional communication strategies for challenging customer situations. Learn de-escalation techniques, empathy-based responses, and how to turn complaints into opportunities.',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 48,
    comments: 12,
    liked: false,
    commentList: [],
  },
  {
    id: 16,
    author: 'DHL Performance',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '10 weeks ago',
    type: 'update',
    title: 'Q3 Performance Highlights & Achievements',
    content: 'Celebrating exceptional Q3 results: 98.5% on-time delivery rate, 15% increase in efficiency metrics, and record customer satisfaction scores. Thank you all for your dedication!',
    image: null,
    video: null,
    youtubeVideoId: null,
    likes: 124,
    comments: 31,
    liked: true,
    commentList: [
      { author: 'Team Member', company: 'DHL', authorAvatar: 'assets/dhl-uk-logo.png', text: 'Great work by everyone! We made a real difference this quarter.', timeAgo: '9 weeks ago' }
    ],
  },
  {
    id: 17,
    author: 'DHL Operations',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '11 weeks ago',
    type: 'update',
    title: 'DHL Fleet Expansion: New Vehicles in London',
    content: 'Expanded our London fleet with modern DHL delivery vehicles. The new vehicles are equipped with GPS tracking, eco-friendly engines, and improved cargo capacity for better service.',
    image: GD_IMAGES.truck_london,
    video: null,
    youtubeVideoId: null,
    likes: 76,
    comments: 16,
    liked: false,
    commentList: [],
  },
  {
    id: 18,
    author: 'DHL Training',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '12 weeks ago',
    type: 'tutorial',
    title: 'Standard Training Procedures Reference',
    content: 'Complete visual guide to our standardized training procedures. All new team members must review and understand these procedures before operational deployment.',
    image: GD_IMAGES.training_procedures,
    video: null,
    youtubeVideoId: null,
    likes: 52,
    comments: 10,
    liked: false,
    commentList: [],
  },
  {
    id: 19,
    author: 'DHL Safety',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '13 weeks ago',
    type: 'info',
    title: 'Essential Safety Equipment & PPE Requirements',
    content: 'Mandatory safety equipment and personal protective equipment (PPE) for all warehouse and field operations. Proper use ensures your safety and the safety of your colleagues.',
    image: GD_IMAGES.safety_equipment,
    video: null,
    youtubeVideoId: null,
    likes: 68,
    comments: 13,
    liked: false,
    commentList: [],
  },
  {
    id: 20,
    author: 'DHL Planning',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '14 weeks ago',
    type: 'update',
    title: 'Optimized Route Maps for Key Delivery Areas',
    content: 'New optimized delivery route maps for major UK metropolitan areas. These routes reduce delivery time by 12% while improving efficiency and customer satisfaction metrics.',
    image: GD_IMAGES.route_map,
    video: null,
    youtubeVideoId: null,
    likes: 71,
    comments: 14,
    liked: false,
    commentList: [],
  },
  {
    id: 21,
    author: 'DHL Field Operations',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '15 weeks ago',
    type: 'info',
    title: 'Delivery Checkpoint Verification Process',
    content: 'Step-by-step guide for checkpoint verification at delivery locations. Proper checkpoint procedures ensure package security and accurate tracking throughout the delivery chain.',
    image: GD_IMAGES.delivery_checkpoint,
    video: null,
    youtubeVideoId: null,
    likes: 54,
    comments: 9,
    liked: false,
    commentList: [],
  },
  {
    id: 22,
    author: 'DHL Compliance',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '16 weeks ago',
    type: 'update',
    title: 'Daily Vehicle Inspection Checklist & Guidelines',
    content: 'Mandatory daily vehicle inspection procedures. Every vehicle must pass safety checks before deployment. These inspections protect our fleet and ensure operational excellence.',
    image: GD_IMAGES.vehicle_inspection,
    video: null,
    youtubeVideoId: null,
    likes: 59,
    comments: 11,
    liked: false,
    commentList: [],
  },
  {
    id: 23,
    author: 'DHL Quality Assurance',
    authorAvatar: 'assets/dhl-uk-logo.png',
    timeAgo: '17 weeks ago',
    type: 'info',
    title: 'Complete Compliance Verification Checklist',
    content: 'Comprehensive compliance checklist for all operations. Regular compliance verification ensures we meet regulatory standards and maintain our operational excellence standards.',
    image: GD_IMAGES.compliance_checklist,
    video: null,
    youtubeVideoId: null,
    likes: 63,
    comments: 12,
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
