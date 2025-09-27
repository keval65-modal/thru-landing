import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app.kiptech.in',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https:",
              "frame-src 'self' https://www.google.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Webpack configuration to handle compatibility issues
  webpack: (config, { isServer }) => {
    // Handle problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
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
