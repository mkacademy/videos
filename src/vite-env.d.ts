/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

// Regular CSS files (non-modules)
declare module "*.css" {
  const content: string;
  export default content;
}

// For Parcel URL approach
declare global {
  interface ImportMeta {
    url: string;
  }
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}
