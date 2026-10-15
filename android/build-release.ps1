param([string]$AndroidSdkPath = $env:ANDROID_HOME)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { Join-Path $root '.tools\jdk17\jdk-17.0.20.1+1' }
$passwordFile = Join-Path $root '.private-release\keystore-password.dpapi'

if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) { throw 'JDK 17 was not found in the local toolchain.' }
$javaRelease = Get-Content (Join-Path $javaHome 'release') -Raw
if ($javaRelease -notmatch 'JAVA_VERSION="17\.') { throw 'JDK 17 is required for this Bubblewrap Android project.' }
if ([string]::IsNullOrWhiteSpace($AndroidSdkPath)) { throw 'Set ANDROID_HOME or pass -AndroidSdkPath.' }
if (-not (Test-Path (Join-Path $AndroidSdkPath 'platforms\android-36\android.jar'))) { throw 'Android SDK Platform 36 is required.' }
if (-not (Test-Path $passwordFile)) { throw 'The local DPAPI-protected signing password is missing.' }

$env:JAVA_HOME = (Resolve-Path $javaHome).Path
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:ANDROID_HOME = (Resolve-Path $AndroidSdkPath).Path
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $root '.tools\gradle-cache'
$sdkPropertyPath = $env:ANDROID_HOME.Replace('\', '\\')
Set-Content -Path (Join-Path $PSScriptRoot 'local.properties') -Value "sdk.dir=$sdkPropertyPath"

$securePassword = Get-Content $passwordFile -Raw | ConvertTo-SecureString
$credential = [System.Management.Automation.PSCredential]::new('jarvis', $securePassword)
$env:JARVIS_ANDROID_KEYSTORE_PASSWORD = $credential.GetNetworkCredential().Password
$env:JARVIS_ANDROID_KEY_PASSWORD = $env:JARVIS_ANDROID_KEYSTORE_PASSWORD

try {
  Push-Location $PSScriptRoot
  try {
    & '.\gradlew.bat' ':app:bundleRelease' ':app:assembleRelease' '--no-daemon'
    if ($LASTEXITCODE -ne 0) { throw "Android release build failed with exit code $LASTEXITCODE." }
  } finally {
    Pop-Location
  }
} finally {
  Remove-Item Env:JARVIS_ANDROID_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:JARVIS_ANDROID_KEY_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable credential, securePassword -ErrorAction SilentlyContinue
}

Write-Output 'Signed Android release artifacts:'
$releaseDirectory = Join-Path $PSScriptRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
$bundle = Get-ChildItem (Join-Path $PSScriptRoot 'app\build\outputs\bundle\release') -Filter '*.aab' | Select-Object -First 1
$apk = Get-ChildItem (Join-Path $PSScriptRoot 'app\build\outputs\apk\release') -Filter '*.apk' | Select-Object -First 1
Copy-Item -LiteralPath $bundle.FullName -Destination (Join-Path $releaseDirectory 'JARVIS-2.0.0-Play-Store.aab') -Force
Copy-Item -LiteralPath $apk.FullName -Destination (Join-Path $releaseDirectory 'JARVIS-2.0.0-Android-test.apk') -Force
Get-ChildItem $releaseDirectory -File | Select-Object FullName, Length
