"use client";

import { useRouter } from "next/navigation";

export default function AdminTrigger() {
  const router = useRouter();

  const handleClick = (e) => {
    e.preventDefault();
    const pw = window.prompt("관리자 비밀번호를 입력하세요:");
    if (pw === "8282") {
      router.push("/admin/login");
    } else if (pw !== null) {
      alert("비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <span 
      onClick={handleClick} 
      style={{ cursor: 'pointer', marginLeft: '6px' }}
      title="관리자 패널"
    >
      🌸
    </span>
  );
}
