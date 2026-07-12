// Resend 이메일 발송 테스트 스크립트
import { Resend } from 'resend';

const resend = new Resend('re_5dDBGZLX_2CQDtQm4jc7txnsFTgFDXYhg');

async function main() {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'admin@code-destiny.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
    });
    console.log('이메일 발송 성공:', result);
  } catch (error) {
    console.error('이메일 발송 실패:', error);
  }
}

main();
