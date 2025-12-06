import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Enable static export for Capacitor mobile app
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Webpack configuration to handle compatibility issues
  webpack: (config, { isServer }) => {
    // Handle problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      '@opentelemetry/exporter-jaeger': false,
      'handlebars': false,
    };

    // Exclude problematic modules from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Exclude server-only modules from client bundle
        '@opentelemetry/sdk-node': false,
        'handlebars': false,
      };
    }

    // Handle webpack compatibility issues
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },

  // Experimental features for better compatibility
  experimental: {
    // Enable modern webpack features
    webpackBuildWorker: true,
  },
};

export default nextConfig;
