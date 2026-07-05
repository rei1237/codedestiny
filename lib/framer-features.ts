// framer-motion 애니메이션 feature 번들을 비동기 청크로 분리하기 위한 진입점.
// domMax = domAnimation + drag + layout — 코드베이스에서 쓰이는 모든 API(제스처/스프링/드래그) 커버.
// AppChrome의 <LazyMotion features={loadFeatures}>가 이 모듈을 동적 import 하여
// First Load JS에서 feature 번들을 제거한다.
export { domMax as default } from "framer-motion";
