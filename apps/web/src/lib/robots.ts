export const ALLOW_INDEXING = import.meta.env.VITE_ALLOW_INDEXING === "true";

export const ROBOTS_META_CONTENT = ALLOW_INDEXING ? "index,follow,max-image-preview:large" : "noindex,nofollow";
