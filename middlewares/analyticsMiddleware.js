const { track } = require('@vercel/analytics/server');

/**
 * Analytics Middleware for Express.js
 * Tracks API requests as custom events using Vercel Web Analytics
 * 
 * Note: Custom events require a Pro or Enterprise Vercel plan
 */
const analyticsMiddleware = async (req, res, next) => {
  // Skip analytics for certain routes (health checks, static files, etc.)
  const skipPaths = ['/favicon.ico', '/robots.txt', '/uploads'];
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  
  if (shouldSkip) {
    return next();
  }

  // Track the request in a non-blocking way
  const startTime = Date.now();
  
  // Capture the response finish event
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    try {
      // Track API request as a custom event
      await track('API Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode.toString(),
        duration: duration.toString(),
        // Add more context if needed
        userAgent: req.get('user-agent')?.substring(0, 100) || 'unknown',
      });
    } catch (error) {
      // Don't block the response if analytics fail
      console.error('Analytics tracking error:', error.message);
    }
  });
  
  next();
};

module.exports = analyticsMiddleware;
