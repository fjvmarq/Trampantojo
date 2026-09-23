# Trampantojo: genera el par de claves VAPID (P-256) de los avisos de agua.
# La privada se queda en worker/.vapid.json (fuera de git); sólo se enseña la pública.
# Uso: pwsh tools/vapid-keys.ps1
$out = Join-Path $PSScriptRoot '..\worker\.vapid.json'
if (Test-Path $out) { Write-Host "Ya existen en $out (no se tocan)."; exit 0 }
$ec = [System.Security.Cryptography.ECDsa]::Create([System.Security.Cryptography.ECCurve+NamedCurves]::nistP256)
$p = $ec.ExportParameters($true)
function B64u([byte[]]$b) { [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
$pub = [byte[]](@([byte]4) + $p.Q.X + $p.Q.Y)
$obj = [ordered]@{
  publicKey  = (B64u $pub)
  privateJwk = [ordered]@{ kty = 'EC'; crv = 'P-256'; x = (B64u $p.Q.X); y = (B64u $p.Q.Y); d = (B64u $p.D) }
}
$obj | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8NoBOM $out
Write-Host "Claves creadas. Pública: $($obj.publicKey)"
