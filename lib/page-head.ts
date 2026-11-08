export const pageHead = (title: string, description: string) => ({ meta: [
  { title: `${title} — المُحَرِّر` }, { name: "description", content: description },
  { property: "og:title", content: `${title} — المُحَرِّر` }, { property: "og:description", content: description },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] });