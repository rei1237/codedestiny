import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext가 next build를 직접 호출하지 않도록 명시적으로 비활성화
export default defineCloudflareConfig({
	nextBuild: false,
	// 필요시 추가 최적화 옵션 삽입 가능
});
