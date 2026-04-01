$ErrorActionPreference = 'Stop'

$root = 'c:\Users\Neo\Desktop\Code Destiny Main'
$staticPath = Join-Path $root 'public\static\index.html'
$localePaths = @(
  'public\en-us\index.html',
  'public\ja-jp\index.html',
  'public\zh-cn\index.html',
  'public\hi-in\index.html',
  'public\es-es\index.html',
  'public\fr-fr\index.html',
  'public\de-de\index.html',
  'public\nl-nl\index.html',
  'public\ms-my\index.html'
) | ForEach-Object { Join-Path $root $_ }

$static = [System.IO.File]::ReadAllText($staticPath)

$cssMatch = [regex]::Match(
  $static,
  '(?s)\.golden-grain-badge\{.*?@media\(max-width:768px\)\{\.golden-grain-badge\{position:static;width:max-content;margin:12px auto 0\}\.logo-area\{position:relative\}\}'
)
if (-not $cssMatch.Success) { throw 'Failed to extract golden coin CSS block from static index.' }
$goldenCss = $cssMatch.Value

$unlockMatch = [regex]::Match(
  $static,
  '(?s)<div class="golden-unlock-area">.*?</div>\s*\n\s*<!-- 하단 상담 신청 띠 -->'
)
if (-not $unlockMatch.Success) { throw 'Failed to extract golden unlock block from static index.' }
$unlockWithComment = $unlockMatch.Value

$modalScriptMatch = [regex]::Match(
  $static,
  '(?s)<div id="goldenGrainChargeModalRoot"></div>\s*\n\s*<script>\s*\(function \(\) \{.*?\n</script>'
)
if (-not $modalScriptMatch.Success) { throw 'Failed to extract golden modal/script block from static index.' }
$modalAndScript = $modalScriptMatch.Value

$updated = @()
$skipped = @()

foreach ($path in $localePaths) {
  $content = [System.IO.File]::ReadAllText($path)
  $original = $content

  if ($content -notmatch 'golden-grain-badge\{') {
    $content = [regex]::Replace(
      $content,
      '(\.auth-btn--login\{[^\r\n]*\}\r?\n)',
      ('$1' + $goldenCss + "`r`n"),
      1
    )
  }

  if ($content -notmatch 'id="goldenGrainBadgeRoot"') {
    $content = [regex]::Replace(
      $content,
      '</div>\r?\n\r?\n\s*</header>',
      '</div>`r`n`r`n      <div id="goldenGrainBadgeRoot"></div>`r`n`r`n    </header>',
      1
    )
  }

  if ($content -notmatch 'class="golden-unlock-area"') {
    $content = $content -replace '<!-- 하단 상담 신청 띠 -->', ($unlockWithComment -replace '\$', '$$')
  }

  if ($content -notmatch 'id="goldenGrainChargeModalRoot"') {
    $content = [regex]::Replace(
      $content,
      '<!-- MBTI/화투 모듈은 mobile-performance-bootstrap에서 필요 시 로드 -->',
      ($modalAndScript + "`r`n`r`n<!-- MBTI/화투 모듈은 mobile-performance-bootstrap에서 필요 시 로드 -->"),
      1
    )
  }

  if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
    $updated += $path
  } else {
    $skipped += $path
  }
}

Write-Output ('UPDATED=' + ($updated.Count))
$updated | ForEach-Object { Write-Output (' + ' + $_) }
Write-Output ('SKIPPED=' + ($skipped.Count))
$skipped | ForEach-Object { Write-Output (' - ' + $_) }
