/**
 * Media Index for SOP Feed
 * Centralized repository for images hosted on Google Drive and YouTube videos
 */

export const MEDIA_INDEX = {
  images: {
    // DHL Training & Operations
    dhL_truck_london: 'https://lh3.googleusercontent.com/d/1K2J3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7=w800',
    dhL_training_procedures: 'https://lh3.googleusercontent.com/d/2A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P=w800',
    dhL_safety_equipment: 'https://lh3.googleusercontent.com/d/3Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F=w800',

    // Route & Operations
    route_map_example: 'https://lh3.googleusercontent.com/d/4G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V=w800',
    delivery_checkpoint: 'https://lh3.googleusercontent.com/d/5W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L=w800',
    vehicle_inspection: 'https://lh3.googleusercontent.com/d/6M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B=w800',

    // Compliance & Documentation
    compliance_checklist: 'https://lh3.googleusercontent.com/d/7C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R=w800',
    documentation_example: 'https://lh3.googleusercontent.com/d/8S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H=w800',
    safety_briefing: 'https://lh3.googleusercontent.com/d/9I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X=w800',
  },

  youtube: {
    // Training Videos
    dhl_training_basics: 'dQw4w9WgXcQ',
    safe_driving_procedures: 'jNQXAC9IVRw',
    package_handling_101: '9bZkp7q19f0',

    // Safety & Compliance
    warehouse_safety: 'xfY6SEb6m7E',
    customer_service_tips: 'aqz-KE-bpKQ',
    compliance_overview: '6Z0NJsDSxVU',

    // Operations
    route_optimization: 'kJQDvkKd5OI',
    delivery_excellence: 'YQHsXMglC9A',
    problem_solving: 'MNyEJIHdJ9s',
  },

  // YouTube thumbnail URLs (auto-generated)
  getYoutubeThumbnail: (videoId: string) =>
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,

  // YouTube video URL
  getYoutubeUrl: (videoId: string) =>
    `https://www.youtube.com/watch?v=${videoId}`,

  // Google Drive image URL (public shared link)
  getDriveImageUrl: (imageKey: string): string => {
    const images = MEDIA_INDEX.images as Record<string, string>;
    return images[imageKey] || '';
  },
};

export type MediaType = 'image' | 'video' | 'youtube';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  category: 'training' | 'safety' | 'operations' | 'compliance' | 'general';
  description?: string;
}

export const MEDIA_CATALOG: MediaItem[] = [
  // Training Videos
  {
    id: 'yt_dhl_training_basics',
    title: 'DHL Training Basics',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('dQw4w9WgXcQ'),
    category: 'training',
    description: 'Complete DHL onboarding and training overview',
  },
  {
    id: 'yt_safe_driving',
    title: 'Safe Driving Procedures',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('jNQXAC9IVRw'),
    category: 'safety',
    description: 'Essential safe driving techniques and best practices',
  },
  {
    id: 'yt_package_handling',
    title: 'Package Handling 101',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('9bZkp7q19f0'),
    category: 'training',
    description: 'Proper package handling and protection methods',
  },

  // Safety Videos
  {
    id: 'yt_warehouse_safety',
    title: 'Warehouse Safety',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=xfY6SEb6m7E',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('xfY6SEb6m7E'),
    category: 'safety',
    description: 'Warehouse safety protocols and equipment usage',
  },
  {
    id: 'yt_customer_service',
    title: 'Customer Service Tips',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('aqz-KE-bpKQ'),
    category: 'training',
    description: 'Delivering excellent customer service every time',
  },

  // Compliance Videos
  {
    id: 'yt_compliance_overview',
    title: 'Compliance Overview',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=6Z0NJsDSxVU',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('6Z0NJsDSxVU'),
    category: 'compliance',
    description: 'Understanding compliance requirements and regulations',
  },

  // Operations Videos
  {
    id: 'yt_route_optimization',
    title: 'Route Optimization',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=kJQDvkKd5OI',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('kJQDvkKd5OI'),
    category: 'operations',
    description: 'Maximize efficiency through optimal route planning',
  },
  {
    id: 'yt_delivery_excellence',
    title: 'Delivery Excellence',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('YQHsXMglC9A'),
    category: 'operations',
    description: 'Achieving delivery excellence every single day',
  },
  {
    id: 'yt_problem_solving',
    title: 'Problem Solving',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=MNyEJIHdJ9s',
    thumbnailUrl: MEDIA_INDEX.getYoutubeThumbnail('MNyEJIHdJ9s'),
    category: 'general',
    description: 'Effective problem-solving strategies in the field',
  },

  // Google Drive Images
  {
    id: 'img_dhl_truck_london',
    title: 'DHL Truck - London',
    type: 'image',
    url: MEDIA_INDEX.images.dhL_truck_london,
    category: 'operations',
    description: 'DHL vehicle example in London operations',
  },
  {
    id: 'img_training_procedures',
    title: 'Training Procedures',
    type: 'image',
    url: MEDIA_INDEX.images.dhL_training_procedures,
    category: 'training',
    description: 'Standard training procedure documentation',
  },
  {
    id: 'img_safety_equipment',
    title: 'Safety Equipment',
    type: 'image',
    url: MEDIA_INDEX.images.dhL_safety_equipment,
    category: 'safety',
    description: 'Required safety equipment for operations',
  },
  {
    id: 'img_route_map',
    title: 'Route Map Example',
    type: 'image',
    url: MEDIA_INDEX.images.route_map_example,
    category: 'operations',
    description: 'Example of optimized delivery route',
  },
  {
    id: 'img_delivery_checkpoint',
    title: 'Delivery Checkpoint',
    type: 'image',
    url: MEDIA_INDEX.images.delivery_checkpoint,
    category: 'operations',
    description: 'Checkpoint verification procedures',
  },
  {
    id: 'img_vehicle_inspection',
    title: 'Vehicle Inspection',
    type: 'image',
    url: MEDIA_INDEX.images.vehicle_inspection,
    category: 'compliance',
    description: 'Daily vehicle inspection checklist',
  },
  {
    id: 'img_compliance_checklist',
    title: 'Compliance Checklist',
    type: 'image',
    url: MEDIA_INDEX.images.compliance_checklist,
    category: 'compliance',
    description: 'Complete compliance verification checklist',
  },
];

// Helper function to get media by category
export function getMediaByCategory(category: string): MediaItem[] {
  return MEDIA_CATALOG.filter((item) => item.category === category);
}

// Helper function to get random media for feed posts
export function getRandomMedia(category?: string): MediaItem | null {
  const filtered = category
    ? getMediaByCategory(category)
    : MEDIA_CATALOG;

  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
