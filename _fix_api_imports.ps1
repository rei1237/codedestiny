$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$rootPath = (Get-Location).Path
$fixedCount = 0

Get-ChildItem "app\api" -Recurse -Filter "*.js" | ForEach-Object {
  $content = [System.IO.File]::ReadAllText($_.FullName)
  if ($content -notmatch '"@/app/') { return }
  
  $fileDir = $_.DirectoryName
  $changed = $false
  
  $newContent = [regex]::Replace($content, '"@/app/([^"]*)"', {
    param($m)
    $targetRelFromRoot = "app\" + $m.Groups[1].Value.Replace("/", "\")
    $absTarget = Join-Path $rootPath $targetRelFromRoot
    try {
      $rel = [System.IO.Path]::GetRelativePath($fileDir, $absTarget)
      if (-not $rel.StartsWith(".")) { $rel = "./" + $rel }
      $rel = $rel.Replace("\", "/")
      $script:changed = $true
      return """$rel"""
    } catch {
      return $m.Value
    }
  })
  
  if ($changed) {
    [System.IO.File]::WriteAllText($_.FullName, $newContent, $utf8NoBom)
    $script:fixedCount++
    $shortPath = $_.FullName.Substring($rootPath.Length + 1)
    Write-Host "Fixed: $shortPath"
  }
}

Write-Host ""
Write-Host "Total files fixed: $fixedCount"
Write-Host ""
Write-Host "Remaining @/ imports in app/api:"
Get-ChildItem "app\api" -Recurse -Filter "*.js" | Where-Object {
  (Select-String -LiteralPath $_.FullName -Pattern '"@/' -Quiet)
} | ForEach-Object {
  $shortPath = $_.FullName.Substring($rootPath.Length + 1)
  Write-Host "  STILL: $shortPath"
}
