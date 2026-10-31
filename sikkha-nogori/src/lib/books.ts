export type Book = {
  slug: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  categorySlug: string;
  price: number | null;
  discountedPrice: number | null;
  listPrice?: number | null;
  description: string;
  cover: string;
  coverAccent: string;
  collections: ("popular" | "new" | "bestseller")[];
  productId?: string;
  imageUrl?: string | null;
  commerceMode?: "affiliate" | "direct" | null;
};

export const bookCategories = [
  {
    title: "ইসলামিক বই",
    slug: "islamic-books",
    href: "/books?category=islamic-books",
    icon: "islamic",
  },
  {
    title: "আরবি শিক্ষা",
    slug: "arabic-learning",
    href: "/books?category=arabic-learning",
    icon: "arabic",
  },
  {
    title: "একাডেমিক বই",
    slug: "academic",
    href: "/books?category=academic",
    icon: "academic",
  },
  {
    title: "ভর্তি ও প্রস্তুতি",
    slug: "admission-prep",
    href: "/books?category=admission-prep",
    icon: "admission",
  },
  {
    title: "ভাষা ও অভিধান",
    slug: "language-dictionary",
    href: "/books?category=language-dictionary",
    icon: "language",
  },
  {
    title: "অন্যান্য বই",
    slug: "other",
    href: "/books?category=other",
    icon: "other",
  },
] as const;

export const books: Book[] = [
  {
    slug: "sohoj-quran-shikkha",
    title: "সহজ কুরআন শিক্ষা",
    author: "মাওলানা আবদুল করিম",
    publisher: "আলোক প্রকাশন",
    category: "ইসলামিক বই",
    categorySlug: "islamic-books",
    price: 450,
    discountedPrice: 360,
    description: "সহজ ভাষায় কুরআন পড়া ও বোঝার প্রাথমিক নির্দেশনা। নতুন শিক্ষার্থীদের জন্য সাজানো এই বইয়ে রয়েছে ধাপে ধাপে অনুশীলন ও প্রয়োজনীয় পরামর্শ।",
    cover: "কুরআন\nশিক্ষা",
    coverAccent: "bg-emerald-800",
    collections: ["popular"],
  },
  {
    slug: "arbi-bhashar-prothom-path",
    title: "আরবি ভাষার প্রথম পাঠ",
    author: "ড. মাহমুদ হাসান",
    publisher: "জ্ঞানধারা প্রকাশনী",
    category: "আরবি শিক্ষা",
    categorySlug: "arabic-learning",
    price: 380,
    discountedPrice: 304,
    description: "আরবি ভাষার অক্ষর, শব্দভান্ডার ও সহজ বাক্য গঠনের প্রাথমিক পাঠ। যারা একেবারে শুরু থেকে শিখতে চান, তাঁদের জন্য ধাপে ধাপে তৈরি একটি নমুনা বই।",
    cover: "আরবি\nভাষা",
    coverAccent: "bg-amber-700",
    collections: ["popular"],
  },
  {
    slug: "sirater-shohoj-path",
    title: "সীরাতের সহজ পাঠ",
    author: "শায়খ আবদুল্লাহ",
    publisher: "নূর প্রকাশ",
    category: "ইসলামিক বই",
    categorySlug: "islamic-books",
    price: 520,
    discountedPrice: 416,
    description: "রাসুলের জীবনের গুরুত্বপূর্ণ অধ্যায়গুলো সহজ ও সাবলীলভাবে উপস্থাপন করা হয়েছে। ইতিহাস থেকে শিক্ষা নিয়ে দৈনন্দিন জীবনে প্রয়োগের জন্য একটি পরিচিতিমূলক পাঠ।",
    cover: "সীরাত\nসংকলন",
    coverAccent: "bg-sky-800",
    collections: ["popular"],
  },
  {
    slug: "sofolotar-jonno-porashona",
    title: "সফলতার জন্য পড়াশোনা",
    author: "নাজমুল হক",
    publisher: "পাঠশালা প্রকাশন",
    category: "একাডেমিক",
    categorySlug: "academic",
    price: 320,
    discountedPrice: 256,
    description: "পড়াশোনার পরিকল্পনা, সময় ব্যবস্থাপনা ও পরীক্ষার প্রস্তুতি নিয়ে শিক্ষার্থীদের উপযোগী কিছু সহজ কৌশল।",
    cover: "পড়াশোনা\nও প্রস্তুতি",
    coverAccent: "bg-violet-800",
    collections: ["popular"],
  },
  {
    slug: "protidiner-arbi",
    title: "প্রতিদিনের আরবি",
    author: "সাদিয়া রহমান",
    publisher: "জ্ঞানধারা প্রকাশনী",
    category: "আরবি শিক্ষা",
    categorySlug: "arabic-learning",
    price: 400,
    discountedPrice: 340,
    description: "প্রতিদিনের দরকারি শব্দ ও ছোট বাক্যের মাধ্যমে আরবি শেখার অনুশীলন। নিয়মিত চর্চায় শব্দভান্ডার বাড়ানোর জন্য সাজানো নমুনা বই।",
    cover: "প্রতিদিনের\nআরবি",
    coverAccent: "bg-teal-800",
    collections: ["new"],
  },
  {
    slug: "shishuder-islami-golpo",
    title: "শিশুদের ইসলামী গল্প",
    author: "ফারহানা ইয়াসমিন",
    publisher: "ছোটদের বইঘর",
    category: "অন্যান্য",
    categorySlug: "other",
    price: 280,
    discountedPrice: 238,
    description: "শিশুদের উপযোগী ছোট গল্পের মাধ্যমে নৈতিক শিক্ষা ও ভালো অভ্যাসের পরিচয়। পরিবারে একসঙ্গে পড়ার জন্য একটি নমুনা গল্পের বই।",
    cover: "গল্পে গল্পে\nশেখা",
    coverAccent: "bg-rose-700",
    collections: ["new"],
  },
  {
    slug: "monojog-diye-shekha",
    title: "মনোযোগ দিয়ে শেখা",
    author: "ইমরান কবির",
    publisher: "পাঠশালা প্রকাশন",
    category: "অন্যান্য",
    categorySlug: "other",
    price: 350,
    discountedPrice: 298,
    description: "মনোযোগ ধরে রাখা, শেখার লক্ষ্য ঠিক করা এবং কার্যকর অভ্যাস গড়ে তোলার কিছু ব্যবহারিক ধারণা।",
    cover: "শেখার\nকৌশল",
    coverAccent: "bg-indigo-800",
    collections: ["new"],
  },
  {
    slug: "bangla-byakoron-onushilon",
    title: "বাংলা ব্যাকরণ অনুশীলন",
    author: "তানভীর আহমেদ",
    publisher: "পাঠশালা প্রকাশন",
    category: "একাডেমিক",
    categorySlug: "academic",
    price: 300,
    discountedPrice: 255,
    description: "বাংলা ব্যাকরণের মৌলিক বিষয় চর্চার জন্য উদাহরণ ও অনুশীলনীসহ একটি শিক্ষামূলক নমুনা বই।",
    cover: "বাংলা\nব্যাকরণ",
    coverAccent: "bg-orange-700",
    collections: ["new"],
  },
  {
    slug: "namaj-orth-o-shikkha",
    title: "নামাজ: অর্থ ও শিক্ষা",
    author: "মুফতি আবু বকর",
    publisher: "আলোক প্রকাশন",
    category: "ইসলামিক বই",
    categorySlug: "islamic-books",
    price: 420,
    discountedPrice: 336,
    description: "নামাজের অর্থ, গুরুত্ব ও দৈনন্দিন জীবনে এর শিক্ষার পরিচিতিমূলক আলোচনা। পাঠকদের সুবিধার জন্য বিষয়গুলো সহজভাবে সাজানো হয়েছে।",
    cover: "নামাজ\nও জীবন",
    coverAccent: "bg-emerald-700",
    collections: ["bestseller"],
  },
  {
    slug: "nahu-shohoje-shikhi",
    title: "নাহু সহজে শিখি",
    author: "উস্তাদ রফিকুল ইসলাম",
    publisher: "জ্ঞানধারা প্রকাশনী",
    category: "আরবি শিক্ষা",
    categorySlug: "arabic-learning",
    price: 500,
    discountedPrice: 400,
    description: "আরবি বাক্য বুঝতে নাহুর প্রাথমিক নিয়ম ও উদাহরণভিত্তিক অনুশীলন। শুরু থেকে শেখার জন্য একটি নমুনা সহায়িকা।",
    cover: "সহজ\nনাহু",
    coverAccent: "bg-cyan-800",
    collections: ["bestseller"],
  },
  {
    slug: "porikkhay-bhalo-korar-upay",
    title: "পরীক্ষায় ভালো করার উপায়",
    author: "রুবাইয়া ইসলাম",
    publisher: "পাঠশালা প্রকাশন",
    category: "ভর্তি ও প্রস্তুতি",
    categorySlug: "admission-prep",
    price: 360,
    discountedPrice: 288,
    description: "পড়ার রুটিন, পুনরাবৃত্তি ও পরীক্ষার আগে প্রস্তুতি নিয়ে শিক্ষার্থীদের জন্য পরামর্শ।",
    cover: "পরীক্ষার\nপ্রস্তুতি",
    coverAccent: "bg-fuchsia-800",
    collections: ["bestseller"],
  },
  {
    slug: "gyan-o-jiboner-golpo",
    title: "জ্ঞান ও জীবনের গল্প",
    author: "আলিফ মাহমুদ",
    publisher: "ছোটদের বইঘর",
    category: "অন্যান্য",
    categorySlug: "other",
    price: 340,
    discountedPrice: 272,
    description: "কৌতূহল, শেখা ও দৈনন্দিন অভিজ্ঞতাকে ঘিরে কিছু ছোট গল্পের সংকলন।",
    cover: "জ্ঞান\nও জীবন",
    coverAccent: "bg-lime-800",
    collections: ["bestseller"],
  },
];

export function getSavings(
  price: number | null,
  listPrice: number | null | undefined,
): { amount: number; percent: number } | null {
  if (price === null || !listPrice || listPrice <= price) {
    return null;
  }
  return {
    amount: listPrice - price,
    percent: Math.round(((listPrice - price) / listPrice) * 100),
  };
}

export function formatPrice(price: number): string {
  return `৳${new Intl.NumberFormat("en-US").format(price)}`;
}

export function getCategorySlug(category: string): string {
  return category
    .normalize("NFKC")
    .toLocaleLowerCase("bn")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export function getBookBySlug(slug: string): Book | undefined {
  return books.find((book) => book.slug === slug);
}

export function getBooksInCollection(
  collection: Book["collections"][number],
): Book[] {
  return books.filter((book) => book.collections.includes(collection));
}

export function getBooksInCategory(categorySlug: string): Book[] {
  return books.filter((book) => book.categorySlug === categorySlug);
}
