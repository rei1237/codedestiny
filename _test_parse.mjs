// test: isAdminUser 구조가 valid JS인지 확인
try {
  new Function(`
    try {
      var x = 1;
      for (var i = 0; i < 1; i++) {}
    }
    try { var y = 2; } catch (_ss) {}
  } catch (_e) {}
  return false;
  `);
  console.log('PARSE OK');
} catch(e) {
  console.log('SYNTAX ERROR:', e.message);
}

// 올바른 구조 테스트
try {
  new Function(`
    try {
      var x = 1;
      for (var i = 0; i < 1; i++) {}
      try { var y = 2; } catch (_ss) {}
    } catch (_e) {}
    return false;
  `);
  console.log('CORRECT STRUCTURE: PARSE OK');
} catch(e) {
  console.log('CORRECT STRUCTURE ERROR:', e.message);
}
