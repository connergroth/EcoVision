// src/types/global.d.ts

// Extend the Window interface to include tensorflow
interface Window {
    tensorflow?: {
      getBackend?: () => string;
      [key: string]: any;
    };
    process?: {
      env: {
        [key: string]: any;
      };
    };
  }