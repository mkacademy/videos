// CSS Module declarations for better TypeScript support

// Completely permissive declaration that allows any property access
declare module "*.module.css" {
  const classes: any;
  export default classes;
  export = classes;
}

// Alternative declaration for namespace imports
declare module "*.module.css" {
  const classes: any;
  export = classes;
}

// Regular CSS files
declare module "*.css" {
  const content: string;
  export default content;
}
