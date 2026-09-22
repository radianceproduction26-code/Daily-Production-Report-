# Batch Encoder for All 14 Scenes and Final MP4 Assembly
$ErrorActionPreference = "Stop"

$baseDir = "scratch\walkthrough_project"
$clipsDir = Join-Path $baseDir "clips"
$framesDir = Join-Path $baseDir "frames"
$audioDir = Join-Path $baseDir "audio"
$concatFile = Join-Path $clipsDir "concat_list.txt"

$scenes = @(
    "scene01", "scene02", "scene03", "scene04",
    "scene05", "scene06", "scene07", "scene08",
    "scene09", "scene10", "scene11", "scene12",
    "scene13", "scene14"
)

$concatLines = @()

Write-Host "=========================================================="
Write-Host "Encoding 14 Scene Clips to 1080p MP4 (H.264 / AAC)..."
Write-Host "=========================================================="

foreach ($id in $scenes) {
    $frame = Join-Path $framesDir "broadcast_$($id).png"
    $audio = Join-Path $audioDir "$($id).wav"
    $clip = Join-Path $clipsDir "clip_$($id).mp4"
    $concatLines += "file 'clip_$($id).mp4'"
    
    Write-Host "Encoding $id -> $clip..."
    & ffmpeg -y -loop 1 -i $frame -i $audio -r 25 -c:v libx264 -tune stillimage -preset fast -crf 20 -c:a aac -ar 44100 -ac 2 -b:a 192k -pix_fmt yuv420p -shortest $clip
}

# Write concat list inside clips directory
Set-Content -Path $concatFile -Value $concatLines -Encoding ASCII

Write-Host "=========================================================="
Write-Host "Concatenating 14 Clips into Master 1080p Walkthrough Video..."
Write-Host "=========================================================="

$outputMaster = "Radiance_Production_Reporting_V1_Training.mp4"
$artifactMaster = "C:\Users\User\.gemini\antigravity-ide\brain\7d6241db-9fa5-45ce-a5dc-6fe8c4ae1d9a\Radiance_Production_Reporting_V1_Training.mp4"

# Concat using stream copy
Push-Location $clipsDir
try {
    & ffmpeg -y -f concat -safe 0 -i "concat_list.txt" -c copy "..\..\$outputMaster"
} finally {
    Pop-Location
}

# Copy to artifact directory as well
Copy-Item $outputMaster -Destination $artifactMaster -Force

Write-Host "Master Video Generated successfully!"
Write-Host "Inspecting Master Video Properties..."
& ffmpeg -i $outputMaster 2>&1 | Select-String "Duration", "Video:", "Audio:"

$fileInfo = Get-Item $outputMaster
Write-Host "File Name: $($fileInfo.Name)"
Write-Host "File Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB ($($fileInfo.Length) bytes)"
