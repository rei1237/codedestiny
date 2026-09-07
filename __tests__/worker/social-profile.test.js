/** @jest-environment node */
let mapSocialProfile;
let normalizeKoreanPhoneNumber;
beforeAll(async () => {
  ({ mapSocialProfile, normalizeKoreanPhoneNumber } = await import('../../worker/lib/social-profile.js'));
});

test('Google keeps verified email tri-state and field precedence', () => {
  expect(mapSocialProfile('google', { sub: 'g', email: 'USER@EXAMPLE.COM', email_verified: false, name: 'Name', given_name: 'Given', picture: 'avatar', phone_number: '+82 10-1234-5678' })).toEqual({ providerId: 'g', email: 'user@example.com', emailVerified: false, name: 'Name', image: 'avatar', phoneNumber: '01012345678' });
  expect(mapSocialProfile('google', {}).emailVerified).toBeNull();
  expect(mapSocialProfile('google', { email_verified: true }).emailVerified).toBe(true);
  expect(mapSocialProfile('google', {}).name).toBe('Google user');
});

test('Naver preserves mobile precedence and birth year trimming', () => {
  expect(mapSocialProfile('naver', { response: { id: 42, email: 'N@EXAMPLE.COM', nickname: 'Nick', mobile: '010-1234-5678', mobile_e164: '+821099998888', birthyear: ' 2000 ' } })).toEqual({ providerId: '42', email: 'n@example.com', emailVerified: null, name: 'Nick', image: '', phoneNumber: '01012345678', birthYear: '2000' });
  expect(mapSocialProfile('naver', {}).name).toBe('Naver user');
});

test('Kakao maps account and profile fallback fields', () => {
  expect(mapSocialProfile('kakao', { id: 7, kakao_account: { is_email_verified: true, profile: { nickname: 'K', thumbnail_image_url: 'thumb' }, phone: '01099998888' } })).toEqual({ providerId: '7', email: '', emailVerified: true, name: 'K', image: 'thumb', phoneNumber: '01099998888' });
  expect(mapSocialProfile('kakao', {}).name).toBe('Kakao user');
  expect(mapSocialProfile('unknown', {})).toEqual({ providerId: '', email: '', emailVerified: null, name: '', image: '' });
});

test('phone normalization keeps local/international forms and rejects invalid numbers', () => {
  for (const value of ['01012345678', '010-1234-5678', '+82 10 1234 5678']) expect(normalizeKoreanPhoneNumber(value)).toBe('01012345678');
  for (const value of ['', null, '0212345678', '010123', '+12125551234']) expect(normalizeKoreanPhoneNumber(value)).toBe('');
});
