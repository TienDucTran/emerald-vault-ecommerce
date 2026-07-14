// Mock data for development. Replace with Supabase queries in production.

import type { Product, Collection } from '@/lib/types';

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: '1',
    name: 'Opalescent Waters',
    slug: 'opalescent-waters',
    description:
      'Lấy cảm hứng từ những bờ biển nhiệt đới, bộ sưu tập tỏa sáng với đá quý xanh như sóng biển. Mỗi món đồ là một viên ngọc kể câu chuyện về đại dương.',
    cover_image_url:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80',
    is_published: true,
    display_order: 1,
    created_at: '2026-07-12T00:00:00Z',
  },
  {
    id: '2',
    name: 'Vintage Autumn',
    slug: 'vintage-autumn',
    description:
      'Tông màu ấm áp của mùa thu với đá carnelian, garnet và amber. Trầm tích của thời gian được lưu giữ trong từng thiết kế.',
    cover_image_url:
      'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
    is_published: true,
    display_order: 2,
    created_at: '2026-07-05T00:00:00Z',
  },
  {
    id: '3',
    name: 'Midnight Garden',
    slug: 'midnight-garden',
    description:
      'Khu vườn huyền bí dưới ánh trăng — emerald, sapphire và những bông hoa bạc tinh tế.',
    cover_image_url:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
    is_published: true,
    display_order: 3,
    created_at: '2026-06-28T00:00:00Z',
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    collection_id: '1',
    title: 'Nhẫn Bạc 925 Opal Hồ Ly',
    slug: 'nhan-bac-925-opal-ho-ly',
    description:
      'Nhẫn bạc 925 Nhật niên 1960s, điểm opal thiên nhiên lấp lánh. Một món đồ vintage hiếm có với lớp patina tự nhiên.',
    material: 'BAC_925',
    category: 'NHAN',
    image_url:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
    ],
    price: 1_850_000,
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SSS',
    season_tags: ['SUMMER_2026'],
    created_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'p2',
    collection_id: '1',
    title: 'Dây Chuyền Bạc Sapphire Đại Dương',
    slug: 'day-chuyen-bac-sapphire-dai-duong',
    description:
      'Dây chuyền bạc Ý với mặt sapphire cabochon cắt mịn. Hoàn hảo cho cả dạo phố lẫn dự tiệc.',
    material: 'BAC_925',
    category: 'DAY_CHUYEN',
    image_url:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
    gallery: [],
    price: 2_450_000,
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SS',
    season_tags: ['SUMMER_2026'],
    created_at: '2026-07-11T00:00:00Z',
  },
  {
    id: 'p3',
    collection_id: '2',
    title: 'Bông Tai Mạ Vàng 18K Garnet Vintage',
    slug: 'bong-tai-ma-vang-garnet',
    description:
      'Bông tai vintage mạ vàng 18K cổ điển, điểm garnet đỏ rượu. Phong cách thập niên 70s.',
    material: 'MA_VANG_18K',
    category: 'BONG_TAI',
    image_url:
      'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600&q=80',
    gallery: [],
    price: 3_200_000,
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SS',
    season_tags: ['VINTAGE_AUTUMN'],
    created_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 'p4',
    collection_id: '2',
    title: 'Vòng Tay Bạc 925 Hoa Văn Lá',
    slug: 'vong-tay-bac-hoa-van-la',
    description:
      'Vòng tay bạc 925 với họa tiết lá thủ công. Đeo đơn lẻ hoặc xếp chồng đều đẹp.',
    material: 'BAC_925',
    category: 'VONG_TAY',
    image_url:
      'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600&q=80',
    gallery: [],
    price: 980_000,
    status: 'AVAILABLE',
    is_featured: false,
    quality_tier: 'S',
    season_tags: ['VINTAGE_AUTUMN'],
    created_at: '2026-07-09T00:00:00Z',
  },
  {
    id: 'p5',
    collection_id: '3',
    title: 'Nhẫn Emerald Vàng 18K Classic',
    slug: 'nhan-emerald-vang-18k',
    description:
      'Nhẫn vàng 18K Ý với emerald cắt emerald-cut. Sang trọng vượt thời gian, phù hợp kỷ niệm.',
    material: 'VANG_18K',
    category: 'NHAN',
    image_url:
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&q=80',
    gallery: [],
    price: 12_800_000,
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SSS',
    season_tags: ['SUMMER_2026'],
    created_at: '2026-07-08T00:00:00Z',
  },
  {
    id: 'p6',
    collection_id: '3',
    title: 'Mặt Dây Bạc Sapphire Hình Giọt Nước',
    slug: 'mat-day-bac-sapphire',
    description:
      'Mặt dây bạc sterling hình giọt nước điểm sapphire xanh dương. Đeo kết hợp với dây chuyền bạc mảnh.',
    material: 'BAC_925',
    category: 'MAT_DAY',
    image_url:
      'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80',
    gallery: [],
    price: 1_650_000,
    status: 'AVAILABLE',
    is_featured: false,
    quality_tier: 'SS',
    season_tags: [],
    created_at: '2026-07-07T00:00:00Z',
  },
  {
    id: 'p7',
    collection_id: '1',
    title: 'Dây Chuyền Pearl Nhật Akoya',
    slug: 'day-chuyen-pearl-akoya',
    description:
      'Dây chuyền ngọc trai Akoya Nhật Bản chính hiệu, ánh sáng tự nhiên đặc trưng.',
    material: 'BAC_925',
    category: 'DAY_CHUYEN',
    image_url:
      'https://images.unsplash.com/photo-1535632066274-36f7d4a1fa83?w=600&q=80',
    gallery: [],
    price: 4_500_000,
    status: 'AVAILABLE',
    is_featured: false,
    quality_tier: 'SSS',
    season_tags: ['SUMMER_2026'],
    created_at: '2026-07-06T00:00:00Z',
  },
  {
    id: 'p8',
    collection_id: '2',
    title: 'Nhẫn Bạc 925 Amber Cognac',
    slug: 'nhan-bac-amber-cognac',
    description:
      'Nhẫn bạc 925 với đá amber màu cognac ấm áp. Một món đồ hoàn hảo cho mùa thu.',
    material: 'BAC_925',
    category: 'NHAN',
    image_url:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
    gallery: [],
    price: 1_350_000,
    status: 'SOLD_OUT',
    is_featured: false,
    quality_tier: 'S',
    season_tags: ['VINTAGE_AUTUMN'],
    created_at: '2026-07-05T00:00:00Z',
  },
  {
    id: 'p9',
    collection_id: '3',
    title: 'Nhẫn Kim Cương Lệ Hoàng Gia',
    slug: 'nhan-kim-cuong-le-hoang-gia',
    description:
      '"Một tuyệt phẩm hiếm hoi từ kỷ nguyên Showa, mang trong mình linh hồn của nghệ thuật kim hoàn Nhật Bản cổ điển. Từng đường nét đều kể về sự kiêu hãnh và vẻ đẹp vĩnh cửu của những giọt lệ hoàng gia."',
    material: 'VANG_18K',
    category: 'NHAN',
    image_url: '/images/product-detail/detail-main-4a0be7.png',
    gallery: [
      '/images/product-detail/detail-main-4a0be7.png',
      '/images/product-detail/thumb-1-4a0be7.png',
      '/images/product-detail/thumb-2-4a0be7.png',
      '/images/product-detail/thumb-3-4a0be7.png',
      '/images/product-detail/thumb-4-4a0be7.png',
    ],
    price: 85_000_000,
    original_price: 110_000_000,
    era: 'Vàng 18K & Kim Cương Tự Nhiên | Nhật Bản thập niên 1960',
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SSS',
    season_tags: [],
    created_at: '2026-07-14T00:00:00Z',
    story_quote:
      '"Mỗi món đồ tại Emerald Vault không chỉ là trang sức, mà là một mảnh ghép của lịch sử được lưu giữ trong những bức tường thành của thời gian."',
    story_body: [
      'Được chế tác thủ công tại Tokyo vào những năm 1960, chiếc nhẫn này đại diện cho sự giao thoa hoàn hảo giữa kỹ thuật kim hoàn phương Tây và thẩm mỹ tinh tế của người Nhật. Central diamond hình giọt nước (pear-shaped) được lựa chọn kỹ lưỡng để đạt đến độ trong suốt hoàn hảo.',
      'Trong thập niên này, trang sức Nhật Bản bắt đầu chuyển mình từ những thiết kế truyền thống sang phong cách Avant-garde đầy táo bạo, nhưng vẫn giữ được sự thanh thoát đặc trưng.',
    ],
    highlight_title: 'Gia Tộc Kỷ Vật',
    highlight_body:
      'Vốn thuộc sở hữu của một gia tộc danh tiếng tại Kyoto, tuyệt phẩm này đã trải qua ba thập kỷ được bảo quản trong két sắt tư nhân trước khi xuất hiện tại Emerald Vault.',
    highlight_image: '/images/product-detail/story-highlight-5bb9e5.png',
    specs: [
      { label: 'Chất liệu', value: 'Vàng 18K (Au750)' },
      { label: 'Kim cương chính', value: '1.2ct — Pear-shaped, VS1, F' },
      { label: 'Kim cương tấm', value: '0.48ct total — Brilliant cut' },
      { label: 'Ni size', value: '12 (có thể chỉnh size)' },
      { label: 'Trọng lượng', value: '5.8 gam' },
      { label: 'Xuất xứ', value: 'Tokyo, Nhật Bản — thập niên 1960' },
      { label: 'Giấy kiểm định', value: 'GIA Certificate #7421' },
    ],
  },
  {
    id: 'p10',
    collection_id: '1',
    title: 'Nhẫn Lục Bảo Art Deco',
    slug: 'nhan-luc-bao-art-deco',
    description:
      'Nhẫn lục bảo (emerald) phong cách Art Deco, đường nét góc cạnh đặc trưng thập niên 1920.',
    material: 'VANG_18K',
    category: 'NHAN',
    image_url: '/images/product-detail/rec-card-1.png',
    gallery: [],
    price: 42_500_000,
    status: 'AVAILABLE',
    is_featured: false,
    quality_tier: 'SS',
    season_tags: [],
    created_at: '2026-07-13T00:00:00Z',
  },
  {
    id: 'p11',
    collection_id: '3',
    title: 'Vòng Cổ Lam Ngọc Cổ',
    slug: 'vong-co-lam-ngoc-co',
    description:
      'Vòng cổ lam ngọc (sapphire) cổ điển, một tuyệt phẩm từ thời kỳ Edo.',
    material: 'VANG_18K',
    category: 'DAY_CHUYEN',
    image_url: '/images/product-detail/rec-card-2.png',
    gallery: [],
    price: 125_000_000,
    status: 'AVAILABLE',
    is_featured: true,
    quality_tier: 'SSS',
    season_tags: [],
    created_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'p12',
    collection_id: '2',
    title: 'Trâm Cài Ngọc Trai Victorian',
    slug: 'tram-cai-ngoc-trai-victorian',
    description:
      'Trâm cài ngọc trai phong cách Victorian, tinh tế và thanh lịch.',
    material: 'BAC_925',
    category: 'MAT_DAY',
    image_url: '/images/product-detail/rec-card-3.png',
    gallery: [],
    price: 18_200_000,
    status: 'AVAILABLE',
    is_featured: false,
    quality_tier: 'S',
    season_tags: [],
    created_at: '2026-07-11T00:00:00Z',
  },
  {
    id: 'p13',
    collection_id: '2',
    title: 'Nhẫn Vàng Hạc Meiji',
    slug: 'nhan-vang-hac-meiji',
    description:
      'Nhẫn vàng thời Meiji với họa tiết hạc — biểu tượng trường thọ.',
    material: 'VANG_18K',
    category: 'NHAN',
    image_url: '/images/product-detail/rec-card-4.png',
    gallery: [],
    price: 55_000_000,
    status: 'SOLD_OUT',
    is_featured: false,
    quality_tier: 'SS',
    season_tags: [],
    created_at: '2026-07-10T00:00:00Z',
  },
];

export function getFeaturedProducts(limit = 4): Product[] {
  return MOCK_PRODUCTS.filter((p) => p.is_featured && p.status === 'AVAILABLE').slice(
    0,
    limit
  );
}

export function getLatestProducts(limit = 8): Product[] {
  return MOCK_PRODUCTS.filter((p) => p.status === 'AVAILABLE')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit);
}

export function getProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}
