"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, PenLine, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";
import { authFetch } from "../_lib/auth-client";
import YeonSpriteFrame from "@/components/yeon/YeonSpriteFrame";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

type SortKey = "latest" | "rating_desc" | "rating_asc";

interface ReviewCard {
  id: string;
  authorName: string;
  authorImage: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  // 옛 엣지 캐시 응답(v1 키)에는 없다. 없으면 배지를 붙이지 않는 쪽으로 떨어진다.
  usageSource?: string;
  displayedAt: string;
}

interface ProductOption {
  productId: string;
  name: string;
  summary: string;
  href: string;
  total: number;
  average: number;
}

interface EligibleProduct {
  productId: string;
  productName: string;
  href: string;
  usedAt: string;
  alreadyReviewed: boolean;
}

interface Summary {
  total: number;
  average: number;
  distribution: Record<string, number>;
}

const SORT_KEYS: SortKey[] = ["latest", "rating_desc", "rating_asc"];

const PAGE_SIZE = 12;
const EMPTY_SUMMARY: Summary = { total: 0, average: 0, distribution: {} };

type ReviewsCopy = {
  sortLabels: Record<SortKey, string>;
  timeJustNow: string;
  timeMinutesAgo: (minutes: number) => string;
  timeHoursAgo: (hours: number) => string;
  timeDaysAgo: (days: number) => string;
  timeMonthsAgo: (months: number) => string;
  timeYearsAgo: (years: number) => string;
  starsAriaLabel: (rating: number) => string;
  avatarAlt: (name: string) => string;
  productPrefix: string;
  verifiedBadge: string;
  experienceBadge: string;
  backHomeAriaLabel: string;
  homeLabel: string;
  yeonAriaLabel: string;
  heroTitle: string;
  writeReviewButton: string;
  totalReviewsLabel: (total: string) => string;
  averageRatingAriaLabel: (average: number) => string;
  starCountLabel: (star: number) => string;
  filterSectionAriaLabel: string;
  allProductsLabel: string;
  sortSelectLabel: string;
  verifiedOnlyLabel: string;
  loadErrorMessage: string;
  emptyStateMessage: string;
  reviewListAriaLabel: string;
  maskedNameNotice: string;
  viewAllButton: (total: string) => string;
  loadMoreButton: string;
  writerDialogAriaLabel: string;
  writerHeading: string;
  writerCloseAriaLabel: string;
  loadingEligibility: string;
  guestMessage: string;
  loginButton: string;
  eligibilityErrorMessage: string;
  noEligibleProductsMessage: string;
  usedProductLabel: string;
  selectProductPlaceholder: string;
  alreadyReviewedSuffix: string;
  allReviewedMessage: string;
  ratingSelectLabel: string;
  starSelectAriaLabel: (star: number) => string;
  titleFieldLabel: string;
  bodyFieldLabel: string;
  bodyPlaceholder: string;
  submitButtonLoading: string;
  submitButtonIdle: string;
  moderationNotice: string;
  rewardNotice: string;
  selectProductError: string;
  bodyTooShortError: string;
  submitFailedFallback: string;
  submitSuccessNotice: string;
  submitFailedRetry: string;
};

const REVIEWS_COPY_EN: ReviewsCopy = {
  sortLabels: { latest: "Newest", rating_desc: "Highest rated", rating_asc: "Lowest rated" },
  timeJustNow: "Just now",
  timeMinutesAgo: (minutes) => `${minutes}m ago`,
  timeHoursAgo: (hours) => `${hours}h ago`,
  timeDaysAgo: (days) => `${days}d ago`,
  timeMonthsAgo: (months) => `${months}mo ago`,
  timeYearsAgo: (years) => `${years}y ago`,
  starsAriaLabel: (rating) => `${rating} out of 5 stars`,
  avatarAlt: (name) => `${name}'s profile photo`,
  productPrefix: "Service: ",
  verifiedBadge: "Verified purchase",
  experienceBadge: "Verified free trial",
  backHomeAriaLabel: "Back to home",
  homeLabel: "Home",
  yeonAriaLabel: "Yeon the piglet",
  heroTitle: "Live user reviews",
  writeReviewButton: "Write a review",
  totalReviewsLabel: (total) => `${total} reviews total`,
  averageRatingAriaLabel: (average) => `Average rating ${average} out of 5`,
  starCountLabel: (star) => `${star} stars`,
  filterSectionAriaLabel: "Review filters",
  allProductsLabel: "All",
  sortSelectLabel: "Sort reviews",
  verifiedOnlyLabel: "Verified purchases only",
  loadErrorMessage: "Couldn't load reviews. Please try again in a moment.",
  emptyStateMessage: "No reviews yet. Be the first to leave one.",
  reviewListAriaLabel: "Review list",
  maskedNameNotice: "Reviewer names are partially hidden to protect privacy.",
  viewAllButton: (total) => `See all reviews (${total}) ›`,
  loadMoreButton: "Load more",
  writerDialogAriaLabel: "Write a review",
  writerHeading: "Write a review",
  writerCloseAriaLabel: "Close review form",
  loadingEligibility: "Checking your purchase history...",
  guestMessage: "Please sign in to write a review.",
  loginButton: "Sign in",
  eligibilityErrorMessage: "Couldn't load your purchase history. Please try again in a moment.",
  noEligibleProductsMessage: "You've reviewed everything you've purchased.",
  usedProductLabel: "Service you used",
  selectProductPlaceholder: "Select a service",
  alreadyReviewedSuffix: " (already reviewed)",
  allReviewedMessage: "You've already reviewed every eligible service.",
  ratingSelectLabel: "Choose a rating",
  starSelectAriaLabel: (star) => `Select ${star} stars`,
  titleFieldLabel: "Title (optional)",
  bodyFieldLabel: "Review (20 characters minimum)",
  bodyPlaceholder: "Tell others what specifically helped you — it makes a big difference for future readers.",
  submitButtonLoading: "Submitting...",
  submitButtonIdle: "Submit review",
  moderationNotice: "Submitted reviews go through moderation before appearing publicly.",
  rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
  selectProductError: "Please choose which service you're reviewing.",
  bodyTooShortError: "Your review needs to be at least 20 characters.",
  submitFailedFallback: "Couldn't submit your review.",
  submitSuccessNotice: "Your review has been submitted. It'll appear after moderation.",
  submitFailedRetry: "Couldn't submit your review. Please try again in a moment.",
};

const REVIEWS_COPY: Partial<Record<LoadingLocale, ReviewsCopy>> = {
  ko: {
    sortLabels: { latest: "최신순", rating_desc: "높은 평점순", rating_asc: "낮은 평점순" },
    timeJustNow: "방금 전",
    timeMinutesAgo: (minutes) => `${minutes}분 전`,
    timeHoursAgo: (hours) => `${hours}시간 전`,
    timeDaysAgo: (days) => `${days}일 전`,
    timeMonthsAgo: (months) => `${months}개월 전`,
    timeYearsAgo: (years) => `${years}년 전`,
    starsAriaLabel: (rating) => `별점 ${rating}점 만점 5점`,
    avatarAlt: (name) => `${name} 프로필 이미지`,
    productPrefix: "상품: ",
    verifiedBadge: "구매 인증",
    experienceBadge: "체험 인증",
    backHomeAriaLabel: "홈으로 돌아가기",
    homeLabel: "홈",
    yeonAriaLabel: "꽃돼지 연이",
    heroTitle: "실시간 사용자 리뷰",
    writeReviewButton: "리뷰 쓰기",
    totalReviewsLabel: (total) => `총 ${total}개의 리뷰`,
    averageRatingAriaLabel: (average) => `평균 별점 ${average}점`,
    starCountLabel: (star) => `${star}점`,
    filterSectionAriaLabel: "리뷰 필터",
    allProductsLabel: "전체",
    sortSelectLabel: "리뷰 정렬",
    verifiedOnlyLabel: "구매 인증 리뷰만",
    loadErrorMessage: "리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    emptyStateMessage: "아직 등록된 리뷰가 없습니다. 첫 번째 후기를 남겨 주세요.",
    reviewListAriaLabel: "리뷰 목록",
    maskedNameNotice: "작성자 이름은 개인정보 보호를 위해 일부만 표시됩니다.",
    viewAllButton: (total) => `리뷰 전체보기 (${total}) ›`,
    loadMoreButton: "더 보기",
    writerDialogAriaLabel: "리뷰 작성",
    writerHeading: "리뷰 쓰기",
    writerCloseAriaLabel: "리뷰 작성 닫기",
    loadingEligibility: "이용 내역을 확인하는 중입니다...",
    guestMessage: "리뷰를 작성하려면 로그인이 필요합니다.",
    loginButton: "로그인하기",
    eligibilityErrorMessage: "이용 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    noEligibleProductsMessage: "이 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다. 상담이나 리포트를 이용하신 뒤에 후기를 남겨 주세요.",
    usedProductLabel: "이용하신 상품",
    selectProductPlaceholder: "상품을 선택하세요",
    alreadyReviewedSuffix: " (작성 완료)",
    allReviewedMessage: "이용하신 모든 상품에 이미 후기를 남기셨습니다.",
    ratingSelectLabel: "별점을 선택해주세요",
    starSelectAriaLabel: (star) => `별점 ${star}점 선택`,
    titleFieldLabel: "제목 (선택)",
    bodyFieldLabel: "후기 (최소 20자)",
    bodyPlaceholder: "어떤 점이 도움이 되었는지 구체적으로 적어주시면 다른 분들에게 큰 도움이 됩니다.",
    submitButtonLoading: "등록 중...",
    submitButtonIdle: "리뷰 등록",
    moderationNotice: "등록한 후기는 바로 공개되지 않고 운영진 검수를 거쳐 반영됩니다.",
    rewardNotice: "검수를 통과해 공개되면 후기 1건당 월정석 100개(1,000원 상당)를 드립니다.",
    selectProductError: "리뷰를 남길 상품을 선택해 주세요.",
    bodyTooShortError: "후기는 20자 이상 작성해 주세요.",
    submitFailedFallback: "리뷰를 등록하지 못했습니다.",
    submitSuccessNotice: "리뷰가 등록되었습니다. 검토 후 반영됩니다.",
    submitFailedRetry: "리뷰를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
  en: REVIEWS_COPY_EN,
  ja: {
    sortLabels: { latest: "新着順", rating_desc: "評価が高い順", rating_asc: "評価が低い順" },
    timeJustNow: "たった今",
    timeMinutesAgo: (minutes) => `${minutes}分前`,
    timeHoursAgo: (hours) => `${hours}時間前`,
    timeDaysAgo: (days) => `${days}日前`,
    timeMonthsAgo: (months) => `${months}か月前`,
    timeYearsAgo: (years) => `${years}年前`,
    starsAriaLabel: (rating) => `5点満点中${rating}点`,
    avatarAlt: (name) => `${name}のプロフィール画像`,
    productPrefix: "サービス: ",
    verifiedBadge: "購入確認済み",
    experienceBadge: "無料体験確認済み",
    backHomeAriaLabel: "ホームに戻る",
    homeLabel: "ホーム",
    yeonAriaLabel: "花豚のヨニ",
    heroTitle: "リアルタイムレビュー",
    writeReviewButton: "レビューを書く",
    totalReviewsLabel: (total) => `合計${total}件のレビュー`,
    averageRatingAriaLabel: (average) => `平均評価${average}点`,
    starCountLabel: (star) => `${star}点`,
    filterSectionAriaLabel: "レビューの絞り込み",
    allProductsLabel: "すべて",
    sortSelectLabel: "レビューの並び替え",
    verifiedOnlyLabel: "購入確認済みのレビューのみ",
    loadErrorMessage: "レビューを読み込めませんでした。しばらくしてから再度お試しください。",
    emptyStateMessage: "まだレビューがありません。最初のレビューを投稿してみてください。",
    reviewListAriaLabel: "レビュー一覧",
    maskedNameNotice: "投稿者名はプライバシー保護のため一部のみ表示されます。",
    viewAllButton: (total) => `すべてのレビューを見る (${total}) ›`,
    loadMoreButton: "もっと見る",
    writerDialogAriaLabel: "レビューを書く",
    writerHeading: "レビューを書く",
    writerCloseAriaLabel: "レビュー作成を閉じる",
    loadingEligibility: "利用履歴を確認しています...",
    guestMessage: "レビューを書くにはログインが必要です。",
    loginButton: "ログインする",
    eligibilityErrorMessage: "利用履歴を読み込めませんでした。しばらくしてから再度お試しください。",
    noEligibleProductsMessage: "このサービスを利用したユーザーのみレビューを書けます。相談やレポートをご利用の後にレビューをお願いします。",
    usedProductLabel: "利用したサービス",
    selectProductPlaceholder: "サービスを選択してください",
    alreadyReviewedSuffix: " (投稿済み)",
    allReviewedMessage: "利用したすべてのサービスに、すでにレビューを投稿済みです。",
    ratingSelectLabel: "評価を選択してください",
    starSelectAriaLabel: (star) => `${star}点を選択`,
    titleFieldLabel: "タイトル (任意)",
    bodyFieldLabel: "レビュー内容 (20文字以上)",
    bodyPlaceholder: "どんな点が役に立ったか具体的に書いていただくと、他の方の参考になります。",
    submitButtonLoading: "送信中...",
    submitButtonIdle: "レビューを投稿",
    moderationNotice: "投稿されたレビューは審査後に公開されます。",
    rewardNotice: "審査を通過して公開されると、レビュー1件につき月精石100個（1,000ウォン相当）を差し上げます。",
    selectProductError: "レビューを投稿するサービスを選択してください。",
    bodyTooShortError: "レビューは20文字以上で入力してください。",
    submitFailedFallback: "レビューを投稿できませんでした。",
    submitSuccessNotice: "レビューを投稿しました。審査後に公開されます。",
    submitFailedRetry: "レビューを投稿できませんでした。しばらくしてから再度お試しください。",
  },
  "zh-CN": {
    sortLabels: { latest: "最新排序", rating_desc: "评分从高到低", rating_asc: "评分从低到高" },
    timeJustNow: "刚刚",
    timeMinutesAgo: (minutes) => `${minutes}分钟前`,
    timeHoursAgo: (hours) => `${hours}小时前`,
    timeDaysAgo: (days) => `${days}天前`,
    timeMonthsAgo: (months) => `${months}个月前`,
    timeYearsAgo: (years) => `${years}年前`,
    starsAriaLabel: (rating) => `评分${rating}分(满分5分)`,
    avatarAlt: (name) => `${name}的头像`,
    productPrefix: "服务: ",
    verifiedBadge: "已验证购买",
    experienceBadge: "已验证免费体验",
    backHomeAriaLabel: "返回首页",
    homeLabel: "首页",
    yeonAriaLabel: "花猪妍伊",
    heroTitle: "实时用户评价",
    writeReviewButton: "写评价",
    totalReviewsLabel: (total) => `共${total}条评价`,
    averageRatingAriaLabel: (average) => `平均评分${average}分`,
    starCountLabel: (star) => `${star}分`,
    filterSectionAriaLabel: "评价筛选",
    allProductsLabel: "全部",
    sortSelectLabel: "评价排序",
    verifiedOnlyLabel: "仅显示已验证购买的评价",
    loadErrorMessage: "无法加载评价，请稍后重试。",
    emptyStateMessage: "还没有评价，快来写下第一条吧。",
    reviewListAriaLabel: "评价列表",
    maskedNameNotice: "为保护隐私，评价者姓名仅部分显示。",
    viewAllButton: (total) => `查看全部评价 (${total}) ›`,
    loadMoreButton: "加载更多",
    writerDialogAriaLabel: "写评价",
    writerHeading: "写评价",
    writerCloseAriaLabel: "关闭评价编辑",
    loadingEligibility: "正在确认使用记录...",
    guestMessage: "撰写评价需要先登录。",
    loginButton: "去登录",
    eligibilityErrorMessage: "无法加载使用记录，请稍后重试。",
    noEligibleProductsMessage: "只有购买过该服务的用户才能撰写评价。请在使用咨询或报告后再来留下评价。",
    usedProductLabel: "使用过的服务",
    selectProductPlaceholder: "请选择服务",
    alreadyReviewedSuffix: " (已评价)",
    allReviewedMessage: "您使用过的所有服务都已评价。",
    ratingSelectLabel: "请选择评分",
    starSelectAriaLabel: (star) => `选择${star}分`,
    titleFieldLabel: "标题 (可选)",
    bodyFieldLabel: "评价内容 (最少20字)",
    bodyPlaceholder: "具体写下哪些地方对您有帮助，能给其他人很大的参考价值。",
    submitButtonLoading: "提交中...",
    submitButtonIdle: "提交评价",
    moderationNotice: "提交的评价将在审核后展示。",
    rewardNotice: "评价通过审核并公开后，每篇可获得 100 颗月精石（约合 1,000 韩元）。",
    selectProductError: "请选择要评价的服务。",
    bodyTooShortError: "评价内容需至少20字。",
    submitFailedFallback: "评价提交失败。",
    submitSuccessNotice: "评价已提交，审核通过后展示。",
    submitFailedRetry: "评价提交失败，请稍后重试。",
  },
  "zh-TW": {
    sortLabels: { latest: "最新排序", rating_desc: "評分由高到低", rating_asc: "評分由低到高" },
    timeJustNow: "剛剛",
    timeMinutesAgo: (minutes) => `${minutes}分鐘前`,
    timeHoursAgo: (hours) => `${hours}小時前`,
    timeDaysAgo: (days) => `${days}天前`,
    timeMonthsAgo: (months) => `${months}個月前`,
    timeYearsAgo: (years) => `${years}年前`,
    starsAriaLabel: (rating) => `評分${rating}分(滿分5分)`,
    avatarAlt: (name) => `${name}的頭像`,
    productPrefix: "服務: ",
    verifiedBadge: "已驗證購買",
    experienceBadge: "已驗證免費體驗",
    backHomeAriaLabel: "返回首頁",
    homeLabel: "首頁",
    yeonAriaLabel: "花豬妍伊",
    heroTitle: "即時用戶評價",
    writeReviewButton: "寫評價",
    totalReviewsLabel: (total) => `共${total}則評價`,
    averageRatingAriaLabel: (average) => `平均評分${average}分`,
    starCountLabel: (star) => `${star}分`,
    filterSectionAriaLabel: "評價篩選",
    allProductsLabel: "全部",
    sortSelectLabel: "評價排序",
    verifiedOnlyLabel: "僅顯示已驗證購買的評價",
    loadErrorMessage: "無法載入評價，請稍後再試。",
    emptyStateMessage: "尚無評價，快來寫下第一則吧。",
    reviewListAriaLabel: "評價列表",
    maskedNameNotice: "為保護隱私，評價者姓名僅部分顯示。",
    viewAllButton: (total) => `查看全部評價 (${total}) ›`,
    loadMoreButton: "載入更多",
    writerDialogAriaLabel: "寫評價",
    writerHeading: "寫評價",
    writerCloseAriaLabel: "關閉評價編輯",
    loadingEligibility: "正在確認使用紀錄...",
    guestMessage: "撰寫評價需要先登入。",
    loginButton: "前往登入",
    eligibilityErrorMessage: "無法載入使用紀錄，請稍後再試。",
    noEligibleProductsMessage: "只有購買過該服務的用戶才能撰寫評價。請在使用諮詢或報告後再留下評價。",
    usedProductLabel: "使用過的服務",
    selectProductPlaceholder: "請選擇服務",
    alreadyReviewedSuffix: " (已評價)",
    allReviewedMessage: "您使用過的所有服務都已評價。",
    ratingSelectLabel: "請選擇評分",
    starSelectAriaLabel: (star) => `選擇${star}分`,
    titleFieldLabel: "標題 (可選)",
    bodyFieldLabel: "評價內容 (最少20字)",
    bodyPlaceholder: "具體寫下哪些地方對您有幫助，能給其他人很大的參考價值。",
    submitButtonLoading: "提交中...",
    submitButtonIdle: "提交評價",
    moderationNotice: "提交的評價將在審核後展示。",
    rewardNotice: "評價通過審核並公開後，每篇可獲得 100 顆月精石（約合 1,000 韓元）。",
    selectProductError: "請選擇要評價的服務。",
    bodyTooShortError: "評價內容需至少20字。",
    submitFailedFallback: "評價提交失敗。",
    submitSuccessNotice: "評價已提交，審核通過後展示。",
    submitFailedRetry: "評價提交失敗，請稍後再試。",
  },
  vi: {
    sortLabels: { latest: "Mới nhất", rating_desc: "Đánh giá cao nhất", rating_asc: "Đánh giá thấp nhất" },
    timeJustNow: "Vừa xong",
    timeMinutesAgo: (minutes) => `${minutes} phút trước`,
    timeHoursAgo: (hours) => `${hours} giờ trước`,
    timeDaysAgo: (days) => `${days} ngày trước`,
    timeMonthsAgo: (months) => `${months} tháng trước`,
    timeYearsAgo: (years) => `${years} năm trước`,
    starsAriaLabel: (rating) => `${rating} trên 5 sao`,
    avatarAlt: (name) => `Ảnh đại diện của ${name}`,
    productPrefix: "Dịch vụ: ",
    verifiedBadge: "Đã xác minh mua hàng",
    experienceBadge: "Đã xác minh dùng thử",
    backHomeAriaLabel: "Quay về trang chủ",
    homeLabel: "Trang chủ",
    yeonAriaLabel: "Heo con Yeon",
    heroTitle: "Đánh giá người dùng thời gian thực",
    writeReviewButton: "Viết đánh giá",
    totalReviewsLabel: (total) => `Tổng ${total} đánh giá`,
    averageRatingAriaLabel: (average) => `Đánh giá trung bình ${average} sao`,
    starCountLabel: (star) => `${star} sao`,
    filterSectionAriaLabel: "Bộ lọc đánh giá",
    allProductsLabel: "Tất cả",
    sortSelectLabel: "Sắp xếp đánh giá",
    verifiedOnlyLabel: "Chỉ hiển thị đánh giá đã xác minh mua hàng",
    loadErrorMessage: "Không thể tải đánh giá. Vui lòng thử lại sau.",
    emptyStateMessage: "Chưa có đánh giá nào. Hãy là người đầu tiên để lại đánh giá.",
    reviewListAriaLabel: "Danh sách đánh giá",
    maskedNameNotice: "Tên người đánh giá được ẩn một phần để bảo vệ quyền riêng tư.",
    viewAllButton: (total) => `Xem tất cả đánh giá (${total}) ›`,
    loadMoreButton: "Xem thêm",
    writerDialogAriaLabel: "Viết đánh giá",
    writerHeading: "Viết đánh giá",
    writerCloseAriaLabel: "Đóng form đánh giá",
    loadingEligibility: "Đang kiểm tra lịch sử sử dụng...",
    guestMessage: "Bạn cần đăng nhập để viết đánh giá.",
    loginButton: "Đăng nhập",
    eligibilityErrorMessage: "Không thể tải lịch sử sử dụng. Vui lòng thử lại sau.",
    noEligibleProductsMessage: "Chỉ những người đã mua dịch vụ này mới có thể viết đánh giá. Vui lòng để lại đánh giá sau khi sử dụng buổi tư vấn hoặc báo cáo.",
    usedProductLabel: "Dịch vụ đã sử dụng",
    selectProductPlaceholder: "Chọn dịch vụ",
    alreadyReviewedSuffix: " (đã đánh giá)",
    allReviewedMessage: "Bạn đã đánh giá tất cả dịch vụ đã sử dụng.",
    ratingSelectLabel: "Chọn số sao đánh giá",
    starSelectAriaLabel: (star) => `Chọn ${star} sao`,
    titleFieldLabel: "Tiêu đề (không bắt buộc)",
    bodyFieldLabel: "Nội dung đánh giá (tối thiểu 20 ký tự)",
    bodyPlaceholder: "Hãy viết cụ thể điều gì đã giúp ích cho bạn — điều này rất hữu ích cho những người đọc sau.",
    submitButtonLoading: "Đang gửi...",
    submitButtonIdle: "Gửi đánh giá",
    moderationNotice: "Đánh giá đã gửi sẽ được kiểm duyệt trước khi hiển thị công khai.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Vui lòng chọn dịch vụ bạn muốn đánh giá.",
    bodyTooShortError: "Đánh giá cần tối thiểu 20 ký tự.",
    submitFailedFallback: "Không thể gửi đánh giá của bạn.",
    submitSuccessNotice: "Đánh giá của bạn đã được gửi. Sẽ hiển thị sau khi kiểm duyệt.",
    submitFailedRetry: "Không thể gửi đánh giá của bạn. Vui lòng thử lại sau.",
  },
  hi: {
    sortLabels: { latest: "नवीनतम", rating_desc: "उच्चतम रेटिंग", rating_asc: "न्यूनतम रेटिंग" },
    timeJustNow: "अभी अभी",
    timeMinutesAgo: (minutes) => `${minutes} मिनट पहले`,
    timeHoursAgo: (hours) => `${hours} घंटे पहले`,
    timeDaysAgo: (days) => `${days} दिन पहले`,
    timeMonthsAgo: (months) => `${months} महीने पहले`,
    timeYearsAgo: (years) => `${years} साल पहले`,
    starsAriaLabel: (rating) => `5 में से ${rating} रेटिंग`,
    avatarAlt: (name) => `${name} की प्रोफ़ाइल फोटो`,
    productPrefix: "सेवा: ",
    verifiedBadge: "सत्यापित खरीद",
    experienceBadge: "सत्यापित नि:शुल्क उपयोग",
    backHomeAriaLabel: "होम पर वापस जाएं",
    homeLabel: "होम",
    yeonAriaLabel: "योन पिगलेट",
    heroTitle: "रीयल-टाइम यूज़र रिव्यू",
    writeReviewButton: "रिव्यू लिखें",
    totalReviewsLabel: (total) => `कुल ${total} रिव्यू`,
    averageRatingAriaLabel: (average) => `औसत रेटिंग ${average}`,
    starCountLabel: (star) => `${star} स्टार`,
    filterSectionAriaLabel: "रिव्यू फ़िल्टर",
    allProductsLabel: "सभी",
    sortSelectLabel: "रिव्यू क्रमबद्ध करें",
    verifiedOnlyLabel: "केवल सत्यापित खरीद वाले रिव्यू",
    loadErrorMessage: "रिव्यू लोड नहीं हो सके। कृपया कुछ देर बाद फिर कोशिश करें।",
    emptyStateMessage: "अभी तक कोई रिव्यू नहीं है। सबसे पहले रिव्यू लिखें।",
    reviewListAriaLabel: "रिव्यू सूची",
    maskedNameNotice: "निजता की सुरक्षा के लिए समीक्षक का नाम आंशिक रूप से ही दिखाया जाता है।",
    viewAllButton: (total) => `सभी रिव्यू देखें (${total}) ›`,
    loadMoreButton: "और देखें",
    writerDialogAriaLabel: "रिव्यू लिखें",
    writerHeading: "रिव्यू लिखें",
    writerCloseAriaLabel: "रिव्यू फ़ॉर्म बंद करें",
    loadingEligibility: "आपका उपयोग इतिहास जांचा जा रहा है...",
    guestMessage: "रिव्यू लिखने के लिए लॉगिन करना आवश्यक है।",
    loginButton: "लॉगिन करें",
    eligibilityErrorMessage: "उपयोग इतिहास लोड नहीं हो सका। कृपया कुछ देर बाद फिर कोशिश करें।",
    noEligibleProductsMessage: "केवल इस सेवा को खरीदने वाले उपयोगकर्ता ही रिव्यू लिख सकते हैं। परामर्श या रिपोर्ट का उपयोग करने के बाद रिव्यू छोड़ें।",
    usedProductLabel: "उपयोग की गई सेवा",
    selectProductPlaceholder: "सेवा चुनें",
    alreadyReviewedSuffix: " (पहले से रिव्यू किया गया)",
    allReviewedMessage: "आपने उपयोग की गई सभी सेवाओं पर रिव्यू दे दिया है।",
    ratingSelectLabel: "रेटिंग चुनें",
    starSelectAriaLabel: (star) => `${star} स्टार चुनें`,
    titleFieldLabel: "शीर्षक (वैकल्पिक)",
    bodyFieldLabel: "रिव्यू (कम से कम 20 अक्षर)",
    bodyPlaceholder: "क्या चीज़ आपके लिए विशेष रूप से मददगार रही, यह लिखें — इससे दूसरों को काफी मदद मिलती है।",
    submitButtonLoading: "सबमिट हो रहा है...",
    submitButtonIdle: "रिव्यू सबमिट करें",
    moderationNotice: "सबमिट किए गए रिव्यू सार्वजनिक होने से पहले समीक्षा से गुजरते हैं।",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "कृपया वह सेवा चुनें जिसके लिए रिव्यू लिखना है।",
    bodyTooShortError: "रिव्यू कम से कम 20 अक्षर का होना चाहिए।",
    submitFailedFallback: "आपका रिव्यू सबमिट नहीं हो सका।",
    submitSuccessNotice: "आपका रिव्यू सबमिट कर दिया गया है। समीक्षा के बाद दिखाई देगा।",
    submitFailedRetry: "आपका रिव्यू सबमिट नहीं हो सका। कृपया कुछ देर बाद फिर कोशिश करें।",
  },
  es: {
    sortLabels: { latest: "Más recientes", rating_desc: "Mejor valoradas", rating_asc: "Peor valoradas" },
    timeJustNow: "Justo ahora",
    timeMinutesAgo: (minutes) => `Hace ${minutes} min`,
    timeHoursAgo: (hours) => `Hace ${hours} h`,
    timeDaysAgo: (days) => `Hace ${days} d`,
    timeMonthsAgo: (months) => `Hace ${months} meses`,
    timeYearsAgo: (years) => `Hace ${years} años`,
    starsAriaLabel: (rating) => `${rating} de 5 estrellas`,
    avatarAlt: (name) => `Foto de perfil de ${name}`,
    productPrefix: "Servicio: ",
    verifiedBadge: "Compra verificada",
    experienceBadge: "Prueba gratuita verificada",
    backHomeAriaLabel: "Volver al inicio",
    homeLabel: "Inicio",
    yeonAriaLabel: "Yeon el cerdito",
    heroTitle: "Reseñas de usuarios en tiempo real",
    writeReviewButton: "Escribir reseña",
    totalReviewsLabel: (total) => `${total} reseñas en total`,
    averageRatingAriaLabel: (average) => `Valoración media de ${average} sobre 5`,
    starCountLabel: (star) => `${star} estrellas`,
    filterSectionAriaLabel: "Filtros de reseñas",
    allProductsLabel: "Todos",
    sortSelectLabel: "Ordenar reseñas",
    verifiedOnlyLabel: "Solo compras verificadas",
    loadErrorMessage: "No se pudieron cargar las reseñas. Inténtalo de nuevo en un momento.",
    emptyStateMessage: "Aún no hay reseñas. Sé el primero en dejar una.",
    reviewListAriaLabel: "Lista de reseñas",
    maskedNameNotice: "Los nombres de los reseñadores se muestran parcialmente para proteger su privacidad.",
    viewAllButton: (total) => `Ver todas las reseñas (${total}) ›`,
    loadMoreButton: "Ver más",
    writerDialogAriaLabel: "Escribir reseña",
    writerHeading: "Escribir reseña",
    writerCloseAriaLabel: "Cerrar formulario de reseña",
    loadingEligibility: "Comprobando tu historial de uso...",
    guestMessage: "Debes iniciar sesión para escribir una reseña.",
    loginButton: "Iniciar sesión",
    eligibilityErrorMessage: "No se pudo cargar tu historial de uso. Inténtalo de nuevo en un momento.",
    noEligibleProductsMessage: "Solo quienes han comprado este servicio pueden escribir una reseña. Deja tu reseña después de usar una consulta o informe.",
    usedProductLabel: "Servicio utilizado",
    selectProductPlaceholder: "Selecciona un servicio",
    alreadyReviewedSuffix: " (ya reseñado)",
    allReviewedMessage: "Ya has reseñado todos los servicios que has utilizado.",
    ratingSelectLabel: "Elige una valoración",
    starSelectAriaLabel: (star) => `Seleccionar ${star} estrellas`,
    titleFieldLabel: "Título (opcional)",
    bodyFieldLabel: "Reseña (mínimo 20 caracteres)",
    bodyPlaceholder: "Cuenta específicamente qué te ayudó — es de gran ayuda para otros lectores.",
    submitButtonLoading: "Enviando...",
    submitButtonIdle: "Enviar reseña",
    moderationNotice: "Las reseñas enviadas pasan por moderación antes de publicarse.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Elige el servicio que quieres reseñar.",
    bodyTooShortError: "Tu reseña debe tener al menos 20 caracteres.",
    submitFailedFallback: "No se pudo enviar tu reseña.",
    submitSuccessNotice: "Tu reseña ha sido enviada. Aparecerá tras la moderación.",
    submitFailedRetry: "No se pudo enviar tu reseña. Inténtalo de nuevo en un momento.",
  },
  fr: {
    sortLabels: { latest: "Plus récentes", rating_desc: "Mieux notées", rating_asc: "Moins bien notées" },
    timeJustNow: "À l'instant",
    timeMinutesAgo: (minutes) => `Il y a ${minutes} min`,
    timeHoursAgo: (hours) => `Il y a ${hours} h`,
    timeDaysAgo: (days) => `Il y a ${days} j`,
    timeMonthsAgo: (months) => `Il y a ${months} mois`,
    timeYearsAgo: (years) => `Il y a ${years} ans`,
    starsAriaLabel: (rating) => `${rating} sur 5 étoiles`,
    avatarAlt: (name) => `Photo de profil de ${name}`,
    productPrefix: "Service : ",
    verifiedBadge: "Achat vérifié",
    experienceBadge: "Essai gratuit vérifié",
    backHomeAriaLabel: "Retour à l'accueil",
    homeLabel: "Accueil",
    yeonAriaLabel: "Yeon le petit cochon",
    heroTitle: "Avis des utilisateurs en temps réel",
    writeReviewButton: "Écrire un avis",
    totalReviewsLabel: (total) => `${total} avis au total`,
    averageRatingAriaLabel: (average) => `Note moyenne de ${average} sur 5`,
    starCountLabel: (star) => `${star} étoiles`,
    filterSectionAriaLabel: "Filtres d'avis",
    allProductsLabel: "Tous",
    sortSelectLabel: "Trier les avis",
    verifiedOnlyLabel: "Achats vérifiés uniquement",
    loadErrorMessage: "Impossible de charger les avis. Réessayez dans un instant.",
    emptyStateMessage: "Pas encore d'avis. Soyez le premier à en laisser un.",
    reviewListAriaLabel: "Liste des avis",
    maskedNameNotice: "Les noms des auteurs d'avis sont partiellement masqués pour protéger leur vie privée.",
    viewAllButton: (total) => `Voir tous les avis (${total}) ›`,
    loadMoreButton: "Voir plus",
    writerDialogAriaLabel: "Écrire un avis",
    writerHeading: "Écrire un avis",
    writerCloseAriaLabel: "Fermer le formulaire d'avis",
    loadingEligibility: "Vérification de votre historique d'utilisation...",
    guestMessage: "Vous devez vous connecter pour écrire un avis.",
    loginButton: "Se connecter",
    eligibilityErrorMessage: "Impossible de charger votre historique d'utilisation. Réessayez dans un instant.",
    noEligibleProductsMessage: "Seuls les utilisateurs ayant acheté ce service peuvent écrire un avis. Laissez votre avis après avoir utilisé une consultation ou un rapport.",
    usedProductLabel: "Service utilisé",
    selectProductPlaceholder: "Sélectionnez un service",
    alreadyReviewedSuffix: " (déjà noté)",
    allReviewedMessage: "Vous avez déjà noté tous les services que vous avez utilisés.",
    ratingSelectLabel: "Choisissez une note",
    starSelectAriaLabel: (star) => `Sélectionner ${star} étoiles`,
    titleFieldLabel: "Titre (facultatif)",
    bodyFieldLabel: "Avis (20 caractères minimum)",
    bodyPlaceholder: "Décrivez précisément ce qui vous a aidé — cela aide beaucoup les autres lecteurs.",
    submitButtonLoading: "Envoi en cours...",
    submitButtonIdle: "Envoyer l'avis",
    moderationNotice: "Les avis envoyés sont modérés avant d'être publiés.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Choisissez le service que vous souhaitez noter.",
    bodyTooShortError: "Votre avis doit comporter au moins 20 caractères.",
    submitFailedFallback: "Votre avis n'a pas pu être envoyé.",
    submitSuccessNotice: "Votre avis a été envoyé. Il apparaîtra après modération.",
    submitFailedRetry: "Votre avis n'a pas pu être envoyé. Réessayez dans un instant.",
  },
  de: {
    sortLabels: { latest: "Neueste", rating_desc: "Beste Bewertung", rating_asc: "Schlechteste Bewertung" },
    timeJustNow: "Gerade eben",
    timeMinutesAgo: (minutes) => `vor ${minutes} Min.`,
    timeHoursAgo: (hours) => `vor ${hours} Std.`,
    timeDaysAgo: (days) => `vor ${days} Tag(en)`,
    timeMonthsAgo: (months) => `vor ${months} Monat(en)`,
    timeYearsAgo: (years) => `vor ${years} Jahr(en)`,
    starsAriaLabel: (rating) => `${rating} von 5 Sternen`,
    avatarAlt: (name) => `Profilbild von ${name}`,
    productPrefix: "Leistung: ",
    verifiedBadge: "Verifizierter Kauf",
    experienceBadge: "Verifizierte Testnutzung",
    backHomeAriaLabel: "Zurück zur Startseite",
    homeLabel: "Startseite",
    yeonAriaLabel: "Ferkel Yeon",
    heroTitle: "Nutzerbewertungen in Echtzeit",
    writeReviewButton: "Bewertung schreiben",
    totalReviewsLabel: (total) => `${total} Bewertungen insgesamt`,
    averageRatingAriaLabel: (average) => `Durchschnittliche Bewertung ${average} von 5`,
    starCountLabel: (star) => `${star} Sterne`,
    filterSectionAriaLabel: "Bewertungsfilter",
    allProductsLabel: "Alle",
    sortSelectLabel: "Bewertungen sortieren",
    verifiedOnlyLabel: "Nur verifizierte Käufe",
    loadErrorMessage: "Bewertungen konnten nicht geladen werden. Bitte versuchen Sie es gleich noch einmal.",
    emptyStateMessage: "Noch keine Bewertungen. Seien Sie die/der Erste.",
    reviewListAriaLabel: "Bewertungsliste",
    maskedNameNotice: "Die Namen der Bewertenden werden zum Schutz der Privatsphäre nur teilweise angezeigt.",
    viewAllButton: (total) => `Alle Bewertungen ansehen (${total}) ›`,
    loadMoreButton: "Mehr anzeigen",
    writerDialogAriaLabel: "Bewertung schreiben",
    writerHeading: "Bewertung schreiben",
    writerCloseAriaLabel: "Bewertungsformular schließen",
    loadingEligibility: "Ihr Nutzungsverlauf wird überprüft...",
    guestMessage: "Zum Schreiben einer Bewertung ist eine Anmeldung erforderlich.",
    loginButton: "Anmelden",
    eligibilityErrorMessage: "Ihr Nutzungsverlauf konnte nicht geladen werden. Bitte versuchen Sie es gleich noch einmal.",
    noEligibleProductsMessage: "Nur Nutzer, die diese Leistung gekauft haben, können eine Bewertung schreiben. Bitte hinterlassen Sie Ihre Bewertung nach einer Beratung oder einem Report.",
    usedProductLabel: "Genutzte Leistung",
    selectProductPlaceholder: "Leistung auswählen",
    alreadyReviewedSuffix: " (bereits bewertet)",
    allReviewedMessage: "Sie haben bereits alle genutzten Leistungen bewertet.",
    ratingSelectLabel: "Bewertung auswählen",
    starSelectAriaLabel: (star) => `${star} Sterne auswählen`,
    titleFieldLabel: "Titel (optional)",
    bodyFieldLabel: "Bewertung (mindestens 20 Zeichen)",
    bodyPlaceholder: "Beschreiben Sie konkret, was Ihnen geholfen hat — das hilft anderen Lesern sehr.",
    submitButtonLoading: "Wird gesendet...",
    submitButtonIdle: "Bewertung absenden",
    moderationNotice: "Eingereichte Bewertungen werden vor der Veröffentlichung geprüft.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Bitte wählen Sie die Leistung aus, die Sie bewerten möchten.",
    bodyTooShortError: "Ihre Bewertung muss mindestens 20 Zeichen lang sein.",
    submitFailedFallback: "Ihre Bewertung konnte nicht gesendet werden.",
    submitSuccessNotice: "Ihre Bewertung wurde gesendet. Sie erscheint nach der Prüfung.",
    submitFailedRetry: "Ihre Bewertung konnte nicht gesendet werden. Bitte versuchen Sie es gleich noch einmal.",
  },
  nl: {
    sortLabels: { latest: "Nieuwste", rating_desc: "Hoogst gewaardeerd", rating_asc: "Laagst gewaardeerd" },
    timeJustNow: "Zojuist",
    timeMinutesAgo: (minutes) => `${minutes} min geleden`,
    timeHoursAgo: (hours) => `${hours} uur geleden`,
    timeDaysAgo: (days) => `${days} dag(en) geleden`,
    timeMonthsAgo: (months) => `${months} maand(en) geleden`,
    timeYearsAgo: (years) => `${years} jaar geleden`,
    starsAriaLabel: (rating) => `${rating} van de 5 sterren`,
    avatarAlt: (name) => `Profielfoto van ${name}`,
    productPrefix: "Dienst: ",
    verifiedBadge: "Geverifieerde aankoop",
    experienceBadge: "Geverifieerd gratis gebruik",
    backHomeAriaLabel: "Terug naar home",
    homeLabel: "Home",
    yeonAriaLabel: "Biggetje Yeon",
    heroTitle: "Live gebruikersreviews",
    writeReviewButton: "Review schrijven",
    totalReviewsLabel: (total) => `In totaal ${total} reviews`,
    averageRatingAriaLabel: (average) => `Gemiddelde beoordeling ${average} van 5`,
    starCountLabel: (star) => `${star} sterren`,
    filterSectionAriaLabel: "Reviewfilters",
    allProductsLabel: "Alle",
    sortSelectLabel: "Reviews sorteren",
    verifiedOnlyLabel: "Alleen geverifieerde aankopen",
    loadErrorMessage: "Reviews konden niet worden geladen. Probeer het over een moment opnieuw.",
    emptyStateMessage: "Nog geen reviews. Wees de eerste die er een achterlaat.",
    reviewListAriaLabel: "Reviewlijst",
    maskedNameNotice: "Namen van reviewers worden gedeeltelijk verborgen om de privacy te beschermen.",
    viewAllButton: (total) => `Alle reviews bekijken (${total}) ›`,
    loadMoreButton: "Meer laden",
    writerDialogAriaLabel: "Review schrijven",
    writerHeading: "Review schrijven",
    writerCloseAriaLabel: "Reviewformulier sluiten",
    loadingEligibility: "Uw gebruiksgeschiedenis wordt gecontroleerd...",
    guestMessage: "U moet inloggen om een review te schrijven.",
    loginButton: "Inloggen",
    eligibilityErrorMessage: "Uw gebruiksgeschiedenis kon niet worden geladen. Probeer het over een moment opnieuw.",
    noEligibleProductsMessage: "Alleen gebruikers die deze dienst hebben gekocht, kunnen een review schrijven. Laat uw review achter na het gebruik van een consult of rapport.",
    usedProductLabel: "Gebruikte dienst",
    selectProductPlaceholder: "Selecteer een dienst",
    alreadyReviewedSuffix: " (al beoordeeld)",
    allReviewedMessage: "U heeft alle gebruikte diensten al beoordeeld.",
    ratingSelectLabel: "Kies een beoordeling",
    starSelectAriaLabel: (star) => `Selecteer ${star} sterren`,
    titleFieldLabel: "Titel (optioneel)",
    bodyFieldLabel: "Review (minimaal 20 tekens)",
    bodyPlaceholder: "Beschrijf specifiek wat u heeft geholpen — dit is erg nuttig voor andere lezers.",
    submitButtonLoading: "Bezig met verzenden...",
    submitButtonIdle: "Review verzenden",
    moderationNotice: "Ingediende reviews worden gemodereerd voordat ze zichtbaar worden.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Selecteer de dienst waarover u een review wilt schrijven.",
    bodyTooShortError: "Uw review moet minstens 20 tekens bevatten.",
    submitFailedFallback: "Uw review kon niet worden verzonden.",
    submitSuccessNotice: "Uw review is verzonden. Deze verschijnt na moderatie.",
    submitFailedRetry: "Uw review kon niet worden verzonden. Probeer het over een moment opnieuw.",
  },
  ms: {
    sortLabels: { latest: "Terbaru", rating_desc: "Penilaian tertinggi", rating_asc: "Penilaian terendah" },
    timeJustNow: "Sebentar tadi",
    timeMinutesAgo: (minutes) => `${minutes} minit lalu`,
    timeHoursAgo: (hours) => `${hours} jam lalu`,
    timeDaysAgo: (days) => `${days} hari lalu`,
    timeMonthsAgo: (months) => `${months} bulan lalu`,
    timeYearsAgo: (years) => `${years} tahun lalu`,
    starsAriaLabel: (rating) => `${rating} daripada 5 bintang`,
    avatarAlt: (name) => `Gambar profil ${name}`,
    productPrefix: "Perkhidmatan: ",
    verifiedBadge: "Pembelian disahkan",
    experienceBadge: "Percubaan percuma disahkan",
    backHomeAriaLabel: "Kembali ke laman utama",
    homeLabel: "Laman utama",
    yeonAriaLabel: "Anak babi Yeon",
    heroTitle: "Ulasan pengguna masa nyata",
    writeReviewButton: "Tulis ulasan",
    totalReviewsLabel: (total) => `Jumlah ${total} ulasan`,
    averageRatingAriaLabel: (average) => `Penilaian purata ${average} daripada 5`,
    starCountLabel: (star) => `${star} bintang`,
    filterSectionAriaLabel: "Penapis ulasan",
    allProductsLabel: "Semua",
    sortSelectLabel: "Susun ulasan",
    verifiedOnlyLabel: "Hanya pembelian disahkan",
    loadErrorMessage: "Tidak dapat memuatkan ulasan. Sila cuba lagi sebentar lagi.",
    emptyStateMessage: "Belum ada ulasan. Jadilah yang pertama meninggalkan ulasan.",
    reviewListAriaLabel: "Senarai ulasan",
    maskedNameNotice: "Nama pengulas dipaparkan sebahagian sahaja untuk melindungi privasi.",
    viewAllButton: (total) => `Lihat semua ulasan (${total}) ›`,
    loadMoreButton: "Muatkan lagi",
    writerDialogAriaLabel: "Tulis ulasan",
    writerHeading: "Tulis ulasan",
    writerCloseAriaLabel: "Tutup borang ulasan",
    loadingEligibility: "Sedang menyemak sejarah penggunaan anda...",
    guestMessage: "Anda perlu log masuk untuk menulis ulasan.",
    loginButton: "Log masuk",
    eligibilityErrorMessage: "Tidak dapat memuatkan sejarah penggunaan anda. Sila cuba lagi sebentar lagi.",
    noEligibleProductsMessage: "Hanya pengguna yang telah membeli perkhidmatan ini boleh menulis ulasan. Sila tinggalkan ulasan selepas menggunakan sesi rundingan atau laporan.",
    usedProductLabel: "Perkhidmatan yang digunakan",
    selectProductPlaceholder: "Pilih perkhidmatan",
    alreadyReviewedSuffix: " (telah diulas)",
    allReviewedMessage: "Anda telah mengulas semua perkhidmatan yang digunakan.",
    ratingSelectLabel: "Pilih penilaian",
    starSelectAriaLabel: (star) => `Pilih ${star} bintang`,
    titleFieldLabel: "Tajuk (pilihan)",
    bodyFieldLabel: "Ulasan (minimum 20 aksara)",
    bodyPlaceholder: "Nyatakan secara khusus perkara yang membantu anda — ini sangat berguna untuk pembaca lain.",
    submitButtonLoading: "Menghantar...",
    submitButtonIdle: "Hantar ulasan",
    moderationNotice: "Ulasan yang dihantar akan disemak sebelum dipaparkan secara umum.",
    rewardNotice: "Approved reviews earn 100 Moonstones (worth about 1,000 KRW), credited once moderation is done.",
    selectProductError: "Sila pilih perkhidmatan yang ingin anda ulas.",
    bodyTooShortError: "Ulasan anda perlu sekurang-kurangnya 20 aksara.",
    submitFailedFallback: "Ulasan anda tidak dapat dihantar.",
    submitSuccessNotice: "Ulasan anda telah dihantar. Ia akan dipaparkan selepas semakan.",
    submitFailedRetry: "Ulasan anda tidak dapat dihantar. Sila cuba lagi sebentar lagi.",
  },
};

function getReviewsCopy(locale: LoadingLocale): ReviewsCopy {
  return REVIEWS_COPY[locale] || REVIEWS_COPY_EN;
}

function useReviewsCopy(): ReviewsCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getReviewsCopy(locale);
}

function formatRelativeTime(value: string, copy: ReviewsCopy): string {
  if (!value) return "";
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return "";

  const diffMs = Date.now() - parsed;
  if (diffMs < 60_000) return copy.timeJustNow;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return copy.timeMinutesAgo(minutes);

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return copy.timeHoursAgo(hours);

  const days = Math.floor(hours / 24);
  if (days < 30) return copy.timeDaysAgo(days);

  const months = Math.floor(days / 30);
  if (months < 12) return copy.timeMonthsAgo(months);

  return copy.timeYearsAgo(Math.floor(months / 12));
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span
      className="text-sm tracking-tight text-[#d4a017] dark:text-[#ead089]"
      aria-label={label}
    >
      {"★".repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-[#e4c8d4] dark:text-[#5a3348]">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function Avatar({ name, image, copy }: { name: string; image: string; copy: ReviewsCopy }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={copy.avatarAlt(name)}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4bed1] text-sm font-semibold text-[#b31955] dark:bg-[#4a1230] dark:text-[#f4bed1]"
    >
      {name.slice(0, 1) || "?"}
    </span>
  );
}

function ReviewCardView({ review, copy }: { review: ReviewCard; copy: ReviewsCopy }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#f0d4de] bg-white p-5 shadow-[0_8px_24px_-18px_rgba(179,25,85,0.45)] dark:border-[#5a3348] dark:bg-[#2b0c1f]">
      <header className="flex items-start gap-3">
        <Avatar name={review.authorName} image={review.authorImage} copy={copy} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#3c1830] dark:text-[#fff1f7]">{review.authorName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Stars rating={review.rating} label={copy.starsAriaLabel(review.rating)} />
            <span className="text-xs text-[#8a6478] dark:text-[#c99cb2]">{formatRelativeTime(review.displayedAt, copy)}</span>
          </div>
        </div>
      </header>

      {review.title ? (
        <h3 className="mt-4 break-keep text-sm font-semibold text-[#3c1830] dark:text-[#fff1f7]">{review.title}</h3>
      ) : null}

      <p className="mt-2 flex-1 whitespace-pre-wrap break-keep text-sm leading-7 text-[#5c3a4d] dark:text-[#f0d0de]">
        {review.body}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f7e6ec] pt-3 dark:border-[#4a2438]">
        <span className="text-xs text-[#8a6478] dark:text-[#c99cb2]">{copy.productPrefix}{review.productName}</span>
        {review.isVerifiedPurchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf0f5] px-2 py-0.5 text-xs font-medium text-[#b31955] dark:bg-[#4a1230] dark:text-[#f4bed1]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.verifiedBadge}
          </span>
        ) : review.usageSource === "free" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f1f6] px-2 py-0.5 text-xs font-medium text-[#6b5470] dark:bg-[#33283c] dark:text-[#cbb8d4]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.experienceBadge}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

export default function ReviewsClient() {
  const copy = useReviewsCopy();
  const numberLocale = INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()];
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const [productFilter, setProductFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [reviews, setReviews] = useState<ReviewCard[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const [writerOpen, setWriterOpen] = useState(false);
  const [eligible, setEligible] = useState<EligibleProduct[]>([]);
  const [eligibleState, setEligibleState] = useState<"idle" | "loading" | "ready" | "guest" | "error">("idle");
  const [formProductId, setFormProductId] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase || ""}/api/reviews/products`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setProducts([]);
    }
  }, [apiBase]);

  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (productFilter) params.set("productId", productFilter);
      const res = await fetch(`${apiBase || ""}/api/reviews/summary?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setSummary({
        total: Number(data?.total || 0),
        average: Number(data?.average || 0),
        distribution: data?.distribution && typeof data.distribution === "object" ? data.distribution : {},
      });
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, [apiBase, productFilter]);

  const loadReviews = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE), sort: sortKey });
      if (productFilter) params.set("productId", productFilter);
      if (verifiedOnly) params.set("verifiedOnly", "1");

      const res = await fetch(`${apiBase || ""}/api/reviews?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(copy.loadErrorMessage);
        return;
      }

      const items: ReviewCard[] = Array.isArray(data?.items) ? data.items : [];
      setReviews((prev) => (append ? [...prev, ...items] : items));
      setTotalPages(Number(data?.pagination?.totalPages || 1));
      setPage(targetPage);
    } catch {
      setListError(copy.loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiBase, productFilter, sortKey, verifiedOnly, copy]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => {
    setMobileExpanded(false);
    void loadReviews(1, false);
  }, [loadReviews]);

  const openWriter = useCallback(async () => {
    setWriterOpen(true);
    setFormError("");
    setFormNotice("");
    setEligibleState("loading");

    try {
      const res = await authFetch("/api/reviews/eligibility", { method: "GET" });
      if (res.status === 401) {
        setEligibleState("guest");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEligibleState("error");
        return;
      }
      const items: EligibleProduct[] = Array.isArray(data?.items) ? data.items : [];
      setEligible(items);
      setFormProductId(items.find((item) => !item.alreadyReviewed)?.productId || "");
      setEligibleState("ready");
    } catch {
      setEligibleState("error");
    }
  }, []);

  const submitReview = useCallback(async () => {
    if (!formProductId) {
      setFormError(copy.selectProductError);
      return;
    }
    if (formBody.trim().length < 20) {
      setFormError(copy.bodyTooShortError);
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const res = await authFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formProductId,
          rating: formRating,
          title: formTitle.trim(),
          body: formBody.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(String(data?.message || copy.submitFailedFallback));
        return;
      }

      setFormNotice(copy.submitSuccessNotice);
      setFormTitle("");
      setFormBody("");
      setEligible((prev) => prev.map((item) => (
        item.productId === formProductId ? { ...item, alreadyReviewed: true } : item
      )));
    } catch {
      setFormError(copy.submitFailedRetry);
    } finally {
      setSubmitting(false);
    }
  }, [formBody, formProductId, formRating, formTitle, copy]);

  const visibleOnMobile = mobileExpanded ? reviews : reviews.slice(0, 3);
  const writableProducts = eligible.filter((item) => !item.alreadyReviewed);

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#3c1830] dark:bg-[#1a0a14] dark:text-[#fff1f7]">
      {/* 몰입형: 전역 헤더·푸터 없이 자체 상단바 */}
      <header className="sticky top-0 z-30 border-b border-[#f0d4de] bg-[#fffaf7]/95 backdrop-blur dark:border-[#4a2438] dark:bg-[#1a0a14]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label={copy.backHomeAriaLabel}
            className="inline-flex min-h-[44px] min-w-11 items-center justify-center gap-1.5 text-sm font-medium text-[#70445c] hover:text-[#b31955] dark:text-[#c99cb2] dark:hover:text-[#f4bed1]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.homeLabel}
          </Link>
          <span className="flex items-center gap-1.5">
            <YeonSpriteFrame
              frame={1}
              ariaLabel={copy.yeonAriaLabel}
              className="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9"
            />
            <p className="text-sm font-semibold">{copy.heroTitle}</p>
          </span>
          <button
            type="button"
            onClick={() => { void openWriter(); }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#b31955] px-4 text-sm font-semibold text-white hover:bg-[#951245] dark:bg-[#f4bed1] dark:text-[#3c1830] dark:hover:bg-[#e9a7c0]"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            {copy.writeReviewButton}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="rounded-3xl border border-[#f0d4de] bg-white px-5 py-7 dark:border-[#5a3348] dark:bg-[#2b0c1f] sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b31955] dark:text-[#f4bed1]">Reviews</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="text-4xl font-black leading-none">{summary.average ? summary.average.toFixed(1) : "-"}</p>
            <div>
              <Stars rating={Math.round(summary.average)} label={copy.averageRatingAriaLabel(summary.average)} />
              <p className="mt-1 text-sm text-[#70445c] dark:text-[#c99cb2]">
                {copy.totalReviewsLabel(summary.total.toLocaleString(numberLocale))}
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = Number(summary.distribution?.[String(star)] || 0);
              const ratio = summary.total ? Math.round((count / summary.total) * 100) : 0;
              return (
                <li key={star} className="flex items-center gap-3 text-xs text-[#70445c] dark:text-[#c99cb2]">
                  <span className="w-8 shrink-0">{copy.starCountLabel(star)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f7e6ec] dark:bg-[#4a2438]">
                    <span
                      className="block h-full rounded-full bg-[#d4a017] dark:bg-[#ead089]"
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6 space-y-3" aria-label={copy.filterSectionAriaLabel}>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setProductFilter("")}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                productFilter === ""
                  ? "border-[#b31955] bg-[#b31955] text-white dark:border-[#f4bed1] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                  : "border-[#f0d4de] bg-white text-[#70445c] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#c99cb2]"
              }`}
            >
              {copy.allProductsLabel}
            </button>
            {products.filter((product) => product.total > 0).map((product) => (
              <button
                key={product.productId}
                type="button"
                onClick={() => setProductFilter(product.productId)}
                className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                  productFilter === product.productId
                    ? "border-[#b31955] bg-[#b31955] text-white dark:border-[#f4bed1] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                    : "border-[#f0d4de] bg-white text-[#70445c] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#c99cb2]"
                }`}
              >
                {product.name} ({product.total})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="review-sort">{copy.sortSelectLabel}</label>
            <select
              id="review-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="min-h-11 rounded-lg border border-[#f0d4de] bg-white px-3 text-base text-[#3c1830] outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>{copy.sortLabels[key]}</option>
              ))}
            </select>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[#70445c] dark:text-[#c99cb2]">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                className="h-4 w-4 rounded border-[#e0aec2] accent-[#b31955]"
              />
              {copy.verifiedOnlyLabel}
            </label>
          </div>
        </section>

        {listError ? (
          <p className="mt-6 rounded-xl border border-[#f0c4d2] bg-[#fdf0f5] px-4 py-3 text-sm text-[#b31955] dark:border-[#7a3050] dark:bg-[#3a0e28] dark:text-[#f4bed1]">
            {listError}
          </p>
        ) : null}

        {!loading && reviews.length === 0 && !listError ? (
          <p className="mt-10 text-center text-sm text-[#70445c] dark:text-[#c99cb2]">
            {copy.emptyStateMessage}
          </p>
        ) : null}

        {/* 모바일: 최근 3개만 노출 → 전체보기로 확장 / 데스크톱: 전체 그리드 */}
        <section className="mt-6" aria-label={copy.reviewListAriaLabel}>
          {/* 작성자 이름은 서버(worker/routes/reviews.js 의 toPublicReview)에서 마스킹돼 내려온다.
              여기서 가리는 것이 아니라, 원본이 애초에 클라이언트로 오지 않는다. */}
          <p className="mb-3 text-xs text-[#8a6478] dark:text-[#c99cb2]">{copy.maskedNameNotice}</p>
          <div className="grid gap-4 sm:hidden">
            {visibleOnMobile.map((review) => (
              <ReviewCardView key={review.id} review={review} copy={copy} />
            ))}
          </div>
          {!mobileExpanded && reviews.length > 3 ? (
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#f0d4de] bg-white text-sm font-medium text-[#b31955] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#f4bed1] sm:hidden"
            >
              {copy.viewAllButton(summary.total.toLocaleString(numberLocale))}
            </button>
          ) : null}

          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCardView key={review.id} review={review} copy={copy} />
            ))}
          </div>
        </section>

        {page < totalPages ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { void loadReviews(page + 1, true); }}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#f0d4de] bg-white px-6 text-sm font-medium text-[#b31955] hover:border-[#e0aec2] disabled:opacity-50 dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#f4bed1]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              {copy.loadMoreButton}
            </button>
          </div>
        ) : null}
      </main>

      {writerOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.writerDialogAriaLabel}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#f0d4de] bg-[#fffaf7] p-5 dark:border-[#5a3348] dark:bg-[#24081a] sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <YeonSpriteFrame
                  frame={4}
                  ariaLabel={copy.yeonAriaLabel}
                  className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12"
                />
                <h2 className="text-base font-semibold">{copy.writerHeading}</h2>
              </span>
              <button
                type="button"
                onClick={() => setWriterOpen(false)}
                aria-label={copy.writerCloseAriaLabel}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#70445c] hover:bg-[#f7e6ec] dark:text-[#c99cb2] dark:hover:bg-[#3a0e28]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {eligibleState === "loading" ? (
              <p className="mt-6 text-sm text-[#70445c] dark:text-[#c99cb2]">{copy.loadingEligibility}</p>
            ) : null}

            {eligibleState === "guest" ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-7 text-[#70445c] dark:text-[#c99cb2]">
                  {copy.guestMessage}
                </p>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#b31955] px-5 text-sm font-semibold text-white hover:bg-[#951245] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                >
                  {copy.loginButton}
                </Link>
              </div>
            ) : null}

            {eligibleState === "error" ? (
              <p className="mt-6 text-sm leading-7 text-[#b31955] dark:text-[#f4bed1]">
                {copy.eligibilityErrorMessage}
              </p>
            ) : null}

            {eligibleState === "ready" && eligible.length === 0 ? (
              <p className="mt-6 text-sm leading-7 text-[#70445c] dark:text-[#c99cb2]">
                {copy.noEligibleProductsMessage}
              </p>
            ) : null}

            {eligibleState === "ready" && eligible.length > 0 ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-product">
                    {copy.usedProductLabel}
                  </label>
                  <select
                    id="review-product"
                    value={formProductId}
                    onChange={(event) => setFormProductId(event.target.value)}
                    className="min-h-[44px] w-full rounded-lg border border-[#f0d4de] bg-white px-3 text-base outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  >
                    <option value="">{copy.selectProductPlaceholder}</option>
                    {eligible.map((item) => (
                      <option key={item.productId} value={item.productId} disabled={item.alreadyReviewed}>
                        {item.productName}{item.alreadyReviewed ? copy.alreadyReviewedSuffix : ""}
                      </option>
                    ))}
                  </select>
                  {writableProducts.length === 0 ? (
                    <p className="text-xs text-[#8a6478] dark:text-[#c99cb2]">
                      {copy.allReviewedMessage}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]">{copy.ratingSelectLabel}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        aria-label={copy.starSelectAriaLabel(star)}
                        className={`min-h-[44px] px-1 text-2xl leading-none transition-colors ${
                          star <= formRating
                            ? "text-[#d4a017] dark:text-[#ead089]"
                            : "text-[#e4c8d4] hover:text-[#d4a017] dark:text-[#5a3348]"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-[#70445c] dark:text-[#c99cb2]">{formRating}.0</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-title">
                    {copy.titleFieldLabel}
                  </label>
                  <input
                    id="review-title"
                    value={formTitle}
                    onChange={(event) => setFormTitle(event.target.value)}
                    maxLength={60}
                    className="min-h-[44px] w-full rounded-lg border border-[#f0d4de] bg-white px-3 text-base outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-body">
                    {copy.bodyFieldLabel}
                  </label>
                  <textarea
                    id="review-body"
                    value={formBody}
                    onChange={(event) => setFormBody(event.target.value)}
                    rows={6}
                    maxLength={1000}
                    placeholder={copy.bodyPlaceholder}
                    className="w-full rounded-lg border border-[#f0d4de] bg-white px-3 py-2 text-base leading-7 outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  />
                  <p className="text-right text-xs text-[#8a6478] dark:text-[#c99cb2]">{formBody.trim().length} / 1000</p>
                </div>

                {formError ? <p className="text-sm text-[#b31955] dark:text-[#f4bed1]">{formError}</p> : null}
                {formNotice ? <p className="text-sm text-[#1f7a4d] dark:text-[#8fe0b4]">{formNotice}</p> : null}

                <button
                  type="button"
                  onClick={() => { void submitReview(); }}
                  disabled={submitting || writableProducts.length === 0}
                  className="min-h-[48px] w-full rounded-full bg-[#b31955] text-sm font-semibold text-white hover:bg-[#951245] disabled:opacity-50 dark:bg-[#f4bed1] dark:text-[#3c1830] dark:hover:bg-[#e9a7c0]"
                >
                  {submitting ? copy.submitButtonLoading : copy.submitButtonIdle}
                </button>

                <p className="rounded-2xl bg-[#fdf1f6] px-4 py-3 text-xs font-semibold leading-6 text-[#b31955] dark:bg-[#3c1830] dark:text-[#f4bed1]">
                  {copy.rewardNotice}
                </p>
                <p className="text-xs leading-6 text-[#8a6478] dark:text-[#c99cb2]">
                  {copy.moderationNotice}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
