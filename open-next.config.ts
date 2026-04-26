import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext가 next build를 직접 호출하지 않도록 명시적으로 비활성화
export default defineCloudflareConfig({
  build: {
    command: "npm run build",
  },
  edgeBuildOptions: {
    // Cloudflare Workers 환경에서 Node.js 내장 모듈 사용 시
    // "Converting 'require' to 'esm' is currently not supported" 에러를 방지하기 위해 외부(external) 처리
    external: [
      "fs", "path", "crypto", "os", "stream", "util", "events", "buffer", 
      "child_process", "assert", "http", "https", "net", "tls", "zlib", "url", "querystring"
    ]
  }
});
