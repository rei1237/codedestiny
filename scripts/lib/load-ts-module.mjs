// 검증 스크립트에서 app/·lib/ 의 TypeScript 모듈을 그대로 불러오기 위한 로더.
//
// tsc 없이 ts.transpileModule 로 즉석 변환하고, Next.js 의 "@/..." 경로 별칭을 레포 루트로 매핑한다.
// 별칭 매핑이 없으면 localSajuCalculator.ts 처럼 "@/lib/cms/build-text" 를 import 하는 모듈에서
// MODULE_NOT_FOUND 로 죽는다(그 상태로 방치되면 회귀 테스트가 조용히 안 돌게 된다).

import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let installed = false;

function transpile(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName,
  }).outputText;
}

function install() {
  if (installed) return;
  installed = true;

  const compileTs = (mod, filename) => {
    mod._compile(transpile(fs.readFileSync(filename, "utf8"), filename), filename);
  };
  Module._extensions[".ts"] = compileTs;
  Module._extensions[".tsx"] = compileTs;

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function resolveWithAlias(request, ...rest) {
    if (typeof request === "string" && request.startsWith("@/")) {
      return originalResolve.call(this, path.join(root, request.slice(2)), ...rest);
    }
    return originalResolve.call(this, request, ...rest);
  };
}

/** 레포 루트 기준 상대 경로의 TS 모듈을 로드한다. */
export function loadTsModule(relativePath) {
  install();
  const fullPath = path.join(root, relativePath);
  const mod = new Module(fullPath);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  mod._compile(transpile(fs.readFileSync(fullPath, "utf8"), fullPath), fullPath);
  return mod.exports;
}
