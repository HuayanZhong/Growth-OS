# Generate Growth OS self-signed code signing test certificate (P3 #18)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools/certs/generate-test-cert.ps1
#   Or with custom password:
#     $env:CSC_KEY_PASSWORD="your-password"
#     powershell -ExecutionPolicy Bypass -File tools/certs/generate-test-cert.ps1
#
# Output:
#   - growth-os-test.pfx  (with private key, used by electron-builder via CSC_LINK)
#   - growth-os-test.cer  (public key, can be imported to Trusted Root for local testing)
#
# Note: Self-signed certs are blocked by Windows SmartScreen.
#       Use only for verifying the signing pipeline. Replace with OV/EV cert before production distribution.

$ErrorActionPreference = "Stop"

$certDir = $PSScriptRoot
$certPath = Join-Path $certDir "growth-os-test.pfx"
$cerPath = Join-Path $certDir "growth-os-test.cer"

# Use CSC_KEY_PASSWORD env var, fallback to test default
$password = $env:CSC_KEY_PASSWORD
if ([string]::IsNullOrEmpty($password)) {
    $password = "growth-os-test-2026"
    Write-Host "CSC_KEY_PASSWORD not set, using test default"
}

# Remove old cert files if exist
if (Test-Path $certPath) { Remove-Item $certPath -Force }
if (Test-Path $cerPath) { Remove-Item $cerPath -Force }

# Generate self-signed code signing cert (3 years validity)
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=Growth OS Test, O=Growth OS, C=CN" `
    -KeyUsage DigitalSignature `
    -FriendlyName "Growth OS Test Code Signing" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(3)

$securePwd = ConvertTo-SecureString $password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $securePwd
Export-Certificate -Cert $cert -FilePath $cerPath

Write-Host "=== Certificate generated ==="
Write-Host "PFX: $certPath"
Write-Host "CER: $cerPath"
Write-Host "Set the password in .env.production as CSC_KEY_PASSWORD"
Write-Host "Note: self-signed cert will be blocked by Windows SmartScreen, for signature pipeline test only"
