import { NextResponse } from 'next/server';

// Resend 라이브러리 불러오기
import Resend from 'resend';

// 환경 변수에서 API 키 가져오기
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 구독자에게 웰컴 메일을 발송하는 함수
 * @param {string} email - 구독자 이메일
 */
export async function sendWelcomeEmail(email) {
  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com', // 발신자 주소
      to: email,
      subject: '구독해주셔서 감사합니다!',
      html: '<h1>환영합니다!</h1><p>매일 운세를 받아보실 수 있습니다.</p>',
    });
    return true;
  } catch (error) {
    console.error('웰컴 메일 발송 오류:', error);
    return false;
  }
}

/**
 * 구독자에게 매일 운세를 발송하는 함수
 * @param {string} email - 구독자 이메일
 * @param {string} fortune - 오늘의 운세 내용
 */
export async function sendDailyFortuneEmail(email, fortune) {
  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: '오늘의 운세',
      html: `<h1>오늘의 운세</h1><p>${fortune}</p>`,
    });
    return true;
  } catch (error) {
    console.error('운세 메일 발송 오류:', error);
    return false;
  }
}

// POST 요청 처리: 구독자 이메일로 웰컴 메일 발송
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }
    const result = await sendWelcomeEmail(email);
    if (result) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '메일 발송 실패' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
