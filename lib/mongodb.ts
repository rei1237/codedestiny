/**
 * lib/mongodb.ts
 *
 * MongoDB 네이티브 드라이버 연결 캐싱 유틸리티.
 * - 개발 환경: global 객체에 캐싱하여 hot-reload 시 연결 초과 방지
 * - 운영 환경: 모듈 스코프 변수로 연결 재사용 (Cloudflare Workers / Node.js 모두 호환)
 *
 * 사용법:
 *   import clientPromise from '@/lib/mongodb'
 *   const client = await clientPromise
 *   const db = client.db()          // 기본 DB (URI에 지정된 DB)
 *   const db = client.db('mydb')    // 명시적으로 DB 이름 지정
 */

import { MongoClient, MongoClientOptions } from "mongodb";

declare global {
  // 개발 환경 hot-reload 시 연결 중복 생성 방지를 위한 global 캐시
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";

if (!uri) {
  throw new Error(
    "[mongodb] MONGO_URI 또는 MONGODB_URI 환경변수가 설정되지 않았습니다."
  );
}

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 15_000,
  socketTimeoutMS: 20_000,
  maxPoolSize: 5,
};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // 개발 환경: global에 캐싱하여 hot-reload마다 새 연결이 생기는 것을 방지
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // 운영 환경: 모듈 스코프 변수로 연결 재사용
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
