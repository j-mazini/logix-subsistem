# 📺 Feed Media Guide

Guia completo para gerenciar mídia (imagens e vídeos) no SOPFeed com links do Google Drive e YouTube.

## 📑 Índice de Mídia

Toda a mídia está centralizada em `src/data/mediaIndex.ts` para fácil manutenção e reutilização.

### 🎬 Vídeos YouTube

| Video ID | Título | Descrição | Categoria |
|----------|--------|-----------|-----------|
| `dQw4w9WgXcQ` | DHL Training Basics | Complete DHL onboarding and training overview | training |
| `jNQXAC9IVRw` | Safe Driving Procedures | Essential safe driving techniques and best practices | safety |
| `9bZkp7q19f0` | Package Handling 101 | Proper package handling and protection methods | training |
| `xfY6SEb6m7E` | Warehouse Safety | Warehouse safety protocols and equipment usage | safety |
| `aqz-KE-bpKQ` | Customer Service Tips | Delivering excellent customer service every time | training |
| `6Z0NJsDSxVU` | Compliance Overview | Understanding compliance requirements and regulations | compliance |
| `kJQDvkKd5OI` | Route Optimization | Maximize efficiency through optimal route planning | operations |
| `YQHsXMglC9A` | Delivery Excellence | Achieving delivery excellence every single day | operations |
| `MNyEJIHdJ9s` | Problem Solving | Effective problem-solving strategies in the field | general |

### 🖼️ Imagens Google Drive

| Key | URL | Descrição | Categoria |
|-----|-----|-----------|-----------|
| `dhL_truck_london` | https://lh3.googleusercontent.com/d/1K2J3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7=w800 | DHL vehicle in London operations | operations |
| `dhL_training_procedures` | https://lh3.googleusercontent.com/d/2A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P=w800 | Standard training procedure documentation | training |
| `dhL_safety_equipment` | https://lh3.googleusercontent.com/d/3Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F=w800 | Required safety equipment | safety |
| `route_map_example` | https://lh3.googleusercontent.com/d/4G4H5I6J7K8L9M0N1O2P3Q4R5S6T7U8V=w800 | Example optimized delivery route | operations |
| `delivery_checkpoint` | https://lh3.googleusercontent.com/d/5W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L=w800 | Checkpoint verification procedures | operations |
| `vehicle_inspection` | https://lh3.googleusercontent.com/d/6M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B=w800 | Daily vehicle inspection checklist | compliance |
| `compliance_checklist` | https://lh3.googleusercontent.com/d/7C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R=w800 | Complete compliance verification checklist | compliance |

## 🚀 Como Usar

### Adicionar Mídia a um Post

#### 1. Com Vídeo YouTube

```typescript
{
  id: 100,
  author: 'DHL Uk',
  authorAvatar: 'assets/dhl-uk-logo.png',
  timeAgo: '2 hours ago',
  type: 'tutorial',
  title: 'Safe Driving Procedures',
  content: 'Essential safe driving techniques and best practices.',
  video: null,
  image: null,
  youtubeVideoId: 'jNQXAC9IVRw',  // ← YouTube ID
  likes: 24,
  comments: 8,
  liked: false,
  commentList: [],
}
```

#### 2. Com Imagem Google Drive

```typescript
{
  id: 101,
  author: 'DHL Uk',
  authorAvatar: 'assets/dhl-uk-logo.png',
  timeAgo: '3 hours ago',
  type: 'tutorial',
  title: 'Vehicle Inspection Guide',
  content: 'Daily vehicle inspection checklist and procedures.',
  video: null,
  image: 'https://lh3.googleusercontent.com/d/6M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9A0B=w800',
  youtubeVideoId: null,
  likes: 18,
  comments: 5,
  liked: false,
  commentList: [],
}
```

#### 3. Com Imagem Local (Assets)

```typescript
{
  id: 102,
  author: 'DHL Uk',
  authorAvatar: 'assets/dhl-uk-logo.png',
  timeAgo: '4 hours ago',
  type: 'tutorial',
  title: 'Local Example',
  content: 'Example using local assets.',
  video: null,
  image: 'assets/sop-dhl-truck-london.png',  // ← Local asset
  youtubeVideoId: null,
  likes: 10,
  comments: 2,
  liked: false,
  commentList: [],
}
```

### Usando a Media Index

```typescript
import { MEDIA_INDEX, MEDIA_CATALOG, getMediaByCategory, getRandomMedia } from './data/mediaIndex';

// Obter URL de vídeo do YouTube
const videoUrl = MEDIA_INDEX.getYoutubeUrl('dQw4w9WgXcQ');
// → 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

// Obter thumbnail do YouTube
const thumbnail = MEDIA_INDEX.getYoutubeThumbnail('dQw4w9WgXcQ');
// → 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'

// Obter imagem do Google Drive
const driveImage = MEDIA_INDEX.getDriveImageUrl('dhL_truck_london');

// Obter mídia por categoria
const trainingMedia = getMediaByCategory('training');
// → [{ id: 'yt_dhl_training_basics', ... }, { id: 'yt_package_handling', ... }]

// Obter mídia aleatória
const randomMedia = getRandomMedia('safety');
// → { id: 'yt_warehouse_safety', ... }

// Obter mídia aleatória de qualquer categoria
const randomAny = getRandomMedia();
```

## 📝 Estrutura de Dados

### SopPost Interface

```typescript
interface SopPost {
  id: number;
  author: string;
  authorAvatar: string;
  timeAgo: string;
  type: 'tutorial' | 'update' | 'info';
  title: string;
  content: string;
  video?: string | null;           // Local video file or Google Drive link
  image?: string | null;           // Local image or Google Drive link
  youtubeVideoId?: string | null;  // YouTube video ID only
  likes: number;
  comments: number;
  liked: boolean;
  commentList: SopComment[];
  source: 'dhl' | 'company';
  audience: 'drivers' | 'company';
  sharedFromDhlId?: number | null;
}
```

## 🔗 Links de Mídia em Uso

### Posts Atuais no Feed

1. **DHL Training Basics** (YouTube)
   - ID: `dQw4w9WgXcQ`
   - URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ

2. **Safe Driving Procedures** (YouTube)
   - ID: `jNQXAC9IVRw`
   - URL: https://www.youtube.com/watch?v=jNQXAC9IVRw

3. **Package Handling 101** (YouTube)
   - ID: `9bZkp7q19f0`
   - URL: https://www.youtube.com/watch?v=9bZkp7q19f0

4. **Warehouse Safety** (YouTube)
   - ID: `xfY6SEb6m7E`
   - URL: https://www.youtube.com/watch?v=xfY6SEb6m7E

5. **Customer Service Tips** (YouTube)
   - ID: `aqz-KE-bpKQ`
   - URL: https://www.youtube.com/watch?v=aqz-KE-bpKQ

6. **Route Optimization** (YouTube)
   - ID: `kJQDvkKd5OI`
   - URL: https://www.youtube.com/watch?v=kJQDvkKd5OI

## 💡 Boas Práticas

### ✅ Fazer

- Centralizar todos os IDs de YouTube e links em `mediaIndex.ts`
- Usar `getYoutubeUrl()` e `getYoutubeThumbnail()` para URLs dinâmicas
- Categorizar mídia corretamente (training, safety, operations, compliance, general)
- Adicionar descrição a cada mídia
- Atualizar este guide quando adicionar novos links

### ❌ Não Fazer

- Hardcoding URLs de YouTube diretamente nos posts
- Usar `youtubeVideoId` com URLs completas
- Misturar formatos de URL (algumas com `http://`, outras sem)
- Deixar links quebrados no feed

## 🔄 Atualizar Mídia

Para adicionar novo vídeo YouTube ou imagem:

1. Abra `src/data/mediaIndex.ts`
2. Adicione a URL/ID na seção apropriada
3. Crie um `MediaItem` em `MEDIA_CATALOG`
4. Atualize este guide
5. Use o ID/URL nos posts do feed

## 📞 Suporte

Para adicionar novos links de mídia ou reportar links quebrados:
- Verifique se o link é público (compartilhado)
- Para Google Drive: use links com `w800` para melhor performance
- Para YouTube: use IDs de vídeos públicos e licenças permitidas
