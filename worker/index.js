/**
 * Cloudflare Worker - SEO + API
 * 
 * This Worker handles:
 * - SEO endpoints: /sitemap.xml, /robots.txt
 * - API endpoints: /api/* (existing functionality)
 * 
 * Deploy with: wrangler deploy
 */

// ==========================================
// SEO ENDPOINTS
// ==========================================

function generateSitemap() {
  const base = "https://code-destiny.com";

  const urls = [
    { path: "/", priority: "1.0", freq: "daily" },
    { path: "/saju", priority: "0.97", freq: "daily" },
    { path: "/saju/basic", priority: "0.95", freq: "weekly" },
    { path: "/saju/lifebook", priority: "0.92", freq: "weekly" },
    { path: "/saju/love-secret", priority: "0.91", freq: "weekly" },
    { path: "/saju/love-simulation", priority: "0.90", freq: "weekly" },
    { path: "/saju-picture", priority: "0.86", freq: "weekly" },
    { path: "/ziwei/chart", priority: "0.95", freq: "weekly" },
    { path: "/tarot", priority: "0.92", freq: "weekly" },
    { path: "/tarot/year", priority: "0.85", freq: "monthly" },
    { path: "/tarot/healing", priority: "0.84", freq: "monthly" },
    { path: "/tarot/love", priority: "0.82", freq: "monthly" },
    { path: "/oracle", priority: "0.88", freq: "weekly" },
    { path: "/oracle/hwatu-life", priority: "0.78", freq: "monthly" },
    { path: "/olympus", priority: "0.72", freq: "monthly" },
    { path: "/premium-unlock", priority: "0.68", freq: "monthly" },
    { path: "/points", priority: "0.66", freq: "monthly" },
    { path: "/insights", priority: "0.85", freq: "weekly" },
    { path: "/about", priority: "0.90", freq: "monthly" },
    { path: "/faq", priority: "0.88", freq: "monthly" },
    { path: "/login", priority: "0.50", freq: "monthly" },
    { path: "/signup", priority: "0.50", freq: "monthly" },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ path, priority, freq }) => `  <url>
    <loc>${base}${path}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

function generateRobots() {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://code-destiny.com/sitemap.xml`;
}

// ==========================================
// API HANDLER (Existing - DO NOT MODIFY)
// ==========================================

async function handleAPI(request, env) {
  // This is a placeholder - your existing API logic goes here
  // All your current /api/* endpoints should be handled here
  
  const url = new URL(request.url);
  
  // Example: Route to specific handlers
  if (url.pathname.startsWith("/api/auth")) {
    return handleAuth(request, env);
  }
  
  if (url.pathname.startsWith("/api/payments")) {
    return handlePayments(request, env);
  }
  
  if (url.pathname.startsWith("/api/fortune")) {
    return handleFortune(request, env);
  }
  
  // Default: 404 for unknown API paths
  return new Response(JSON.stringify({ error: "API endpoint not found" }), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Placeholder handlers - replace with your actual implementations
async function handleAuth(request, env) {
  // Your existing auth logic
  return new Response("Auth endpoint - implement your logic", { status: 200 });
}

async function handlePayments(request, env) {
  // Your existing payments logic
  return new Response("Payments endpoint - implement your logic", { status: 200 });
}

async function handleFortune(request, env) {
  // Your existing fortune logic
  return new Response("Fortune endpoint - implement your logic", { status: 200 });
}

// ==========================================
// MAIN FETCH HANDLER
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // ==========================================
    // SEO ENDPOINTS (NEW)
    // ==========================================
    
    if (url.pathname === "/sitemap.xml") {
      return new Response(generateSitemap(), {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
    
    if (url.pathname === "/robots.txt") {
      return new Response(generateRobots(), {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    
    // ==========================================
    // API ENDPOINTS (EXISTING - UNCHANGED)
    // ==========================================
    
    if (url.pathname.startsWith("/api/")) {
      const response = await handleAPI(request, env);
      
      // Add CORS headers to API responses
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    
    // ==========================================
    // 404 FOR UNKNOWN PATHS
    // ==========================================
    
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
