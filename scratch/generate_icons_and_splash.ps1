# Radiance Polymers - High-Fidelity Android & PWA Icon and Splash Generator
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$logoPath = Resolve-Path "radiance-polymer-logo.png"
$logo = [System.Drawing.Image]::FromFile($logoPath)

Write-Host "Source Logo: $($logo.Width) x $($logo.Height)"

# Helper function to generate a centered icon with high quality
function Render-Icon {
    param (
        [string]$outputPath,
        [int]$width,
        [int]$height,
        [string]$bgType = "white", # "white", "transparent", "circle"
        [double]$scaleFactor = 0.85 # Portion of dimension to fill
    )

    $dir = Split-Path $outputPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $target = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($target)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgType -eq "white") {
        $g.Clear([System.Drawing.Color]::White)
    } elseif ($bgType -eq "circle") {
        $g.Clear([System.Drawing.Color]::Transparent)
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
        $g.FillEllipse($brush, 0, 0, $width, $height)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Calculate proportional fit
    $maxW = $width * $scaleFactor
    $maxH = $height * $scaleFactor
    $scale = [Math]::Min($maxW / $logo.Width, $maxH / $logo.Height)

    $destW = [int]($logo.Width * $scale)
    $destH = [int]($logo.Height * $scale)
    $destX = [int](($width - $destW) / 2)
    $destY = [int](($height - $destH) / 2)

    $g.DrawImage($logo, $destX, $destY, $destW, $destH)

    $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $target.Dispose()
    Write-Host "Generated: $outputPath ($($width)x$($height))"
}

# 1. Android Mipmap Icons
$densities = @(
    @{ Name = "mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "xxxhdpi"; Size = 192; ForeSize = 432 }
)

foreach ($d in $densities) {
    $dir = "android\app\src\main\res\mipmap-$($d.Name)"
    
    # Standard square icon on white
    Render-Icon -outputPath "$dir\ic_launcher.png" -width $d.Size -height $d.Size -bgType "white" -scaleFactor 0.90
    
    # Round icon
    Render-Icon -outputPath "$dir\ic_launcher_round.png" -width $d.Size -height $d.Size -bgType "circle" -scaleFactor 0.80
    
    # Adaptive foreground (safe zone is ~66% of 108dp canvas)
    Render-Icon -outputPath "$dir\ic_launcher_foreground.png" -width $d.ForeSize -height $d.ForeSize -bgType "transparent" -scaleFactor 0.65
}

# 2. Android Splash Screens
$splashScreens = @(
    @{ Path = "android\app\src\main\res\drawable\splash.png"; W = 480; H = 320 },
    @{ Path = "android\app\src\main\res\drawable-land-mdpi\splash.png"; W = 480; H = 320 },
    @{ Path = "android\app\src\main\res\drawable-land-hdpi\splash.png"; W = 800; H = 480 },
    @{ Path = "android\app\src\main\res\drawable-land-xhdpi\splash.png"; W = 1280; H = 720 },
    @{ Path = "android\app\src\main\res\drawable-land-xxhdpi\splash.png"; W = 1600; H = 960 },
    @{ Path = "android\app\src\main\res\drawable-land-xxxhdpi\splash.png"; W = 1920; H = 1280 },
    @{ Path = "android\app\src\main\res\drawable-port-mdpi\splash.png"; W = 320; H = 480 },
    @{ Path = "android\app\src\main\res\drawable-port-hdpi\splash.png"; W = 480; H = 800 },
    @{ Path = "android\app\src\main\res\drawable-port-xhdpi\splash.png"; W = 720; H = 1280 },
    @{ Path = "android\app\src\main\res\drawable-port-xxhdpi\splash.png"; W = 960; H = 1600 },
    @{ Path = "android\app\src\main\res\drawable-port-xxxhdpi\splash.png"; W = 1280; H = 1920 }
)

foreach ($s in $splashScreens) {
    # Splash screens have white background and logo at comfortable ~40-50% scale
    Render-Icon -outputPath $s.Path -width $s.W -height $s.H -bgType "white" -scaleFactor 0.45
}

# 3. PWA & Web Icons
Render-Icon -outputPath "public\icon-192.png" -width 192 -height 192 -bgType "white" -scaleFactor 0.88
Render-Icon -outputPath "public\icon-512.png" -width 512 -height 512 -bgType "white" -scaleFactor 0.88
Render-Icon -outputPath "public\icon-maskable-192.png" -width 192 -height 192 -bgType "white" -scaleFactor 0.65
Render-Icon -outputPath "public\icon-maskable-512.png" -width 512 -height 512 -bgType "white" -scaleFactor 0.65
Render-Icon -outputPath "public\apple-touch-icon.png" -width 180 -height 180 -bgType "white" -scaleFactor 0.88
Render-Icon -outputPath "public\favicon-32x32.png" -width 32 -height 32 -bgType "white" -scaleFactor 0.95
Render-Icon -outputPath "public\favicon-16x16.png" -width 16 -height 16 -bgType "white" -scaleFactor 0.95
Render-Icon -outputPath "public\favicon.png" -width 64 -height 64 -bgType "white" -scaleFactor 0.92

$logo.Dispose()
Write-Host "All Android icons, splash screens, and PWA icons rendered successfully!"
