Add-Type -AssemblyName System.Drawing

# Build region masks from the pale seams in the supplied muscle-map art.
# Pixels below the seam brightness threshold are assigned to their enclosed
# anatomical section; the map's original linework remains visible underneath.
$sourcePath = Join-Path $PSScriptRoot "muscle-map-neutral.png"
$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
$width = $source.Width
$height = $source.Height
$pixelCount = $width * $height
$bodyPixel = [byte[]]::new($pixelCount)

for ($y = 0; $y -lt $height; $y++) {
  for ($x = 0; $x -lt $width; $x++) {
    $pixel = $source.GetPixel($x, $y)
    if (($pixel.R + $pixel.G + $pixel.B) / 3 -lt 203) {
      $bodyPixel[$y * $width + $x] = 1
    }
  }
}

$seen = [byte[]]::new($pixelCount)
$labels = [int[]]::new($pixelCount)
$queue = [int[]]::new($pixelCount)
$centers = [System.Collections.Generic.List[object]]::new()
$componentId = 0

for ($start = 0; $start -lt $pixelCount; $start++) {
  if ($bodyPixel[$start] -eq 0 -or $seen[$start] -ne 0) { continue }
  $componentId++
  $head = 0
  $tail = 0
  $queue[$tail++] = $start
  $seen[$start] = 1
  $sumX = 0L
  $sumY = 0L

  while ($head -lt $tail) {
    $index = $queue[$head++]
    $x = $index % $width
    $y = [int][Math]::Floor($index / $width)
    $sumX += $x
    $sumY += $y
    $labels[$index] = $componentId
    $neighbors = @(
      $(if ($x -gt 0) { $index - 1 } else { -1 }),
      $(if ($x -lt $width - 1) { $index + 1 } else { -1 }),
      $(if ($y -gt 0) { $index - $width } else { -1 }),
      $(if ($y -lt $height - 1) { $index + $width } else { -1 })
    )
    foreach ($neighbor in $neighbors) {
      if ($neighbor -ge 0 -and $bodyPixel[$neighbor] -eq 1 -and $seen[$neighbor] -eq 0) {
        $seen[$neighbor] = 1
        $queue[$tail++] = $neighbor
      }
    }
  }

  $centers.Add([pscustomobject]@{
    Id = $componentId
    X = [int]($sumX / $tail)
    Y = [int]($sumY / $tail)
  })
}

# Component IDs are discovered in row-major order. The assignments below
# group the corresponding enclosed sections into the app's muscle IDs.
$assignment = @{
  6 = @("traps", "upperBack")
  11 = @("shoulders")
  12 = @("shoulders")
  13 = @("upperBack", "lats")
  14 = @("upperBack", "lats")
  15 = @("shoulders")
  16 = @("shoulders")
  17 = @("chest")
  18 = @("chest")
  19 = @("triceps")
  20 = @("triceps")
  24 = @("lats")
  26 = @("lats")
  27 = @("biceps", "triceps")
  28 = @("biceps", "triceps")
  29 = @("serratus")
  30 = @("serratus")
  31 = @("abs")
  32 = @("abs")
  33 = @("abs")
  34 = @("serratus")
  35 = @("serratus")
  36 = @("triceps", "forearms")
  37 = @("triceps", "forearms")
  38 = @("abs")
  39 = @("abs")
  40 = @("serratus")
  41 = @("serratus")
  42 = @("lowerBack")
  43 = @("forearms")
  45 = @("forearms")
  46 = @("serratus")
  47 = @("forearms")
  48 = @("forearms")
  50 = @("forearms")
  51 = @("forearms")
  52 = @("serratus")
  53 = @("serratus")
  54 = @("abs")
  55 = @("abs")
  58 = @("obliques")
  59 = @("obliques")
  60 = @("abs")
  61 = @("glutes")
  62 = @("glutes")
  63 = @("obliques", "lowerBack")
  65 = @("obliques", "lowerBack")
  66 = @("quads")
  67 = @("quads")
  68 = @("adductors")
  69 = @("adductors")
  70 = @("quads")
  72 = @("quads")
  76 = @("quads")
  77 = @("quads")
  78 = @("adductors")
  79 = @("adductors")
  80 = @("hamstrings")
  81 = @("hamstrings")
  82 = @("hamstrings")
  83 = @("hamstrings")
  84 = @("hamstrings")
  85 = @("hamstrings")
  86 = @("hamstrings")
  87 = @("hamstrings")
  91 = @("calves")
  92 = @("calves")
  97 = @("calves")
  98 = @("calves")
  99 = @("calves")
  100 = @("calves")
  101 = @("calves")
  102 = @("calves")
  104 = @("calves")
  105 = @("calves")
  106 = @("calves")
  107 = @("calves")
}

$splitAtCenter = @{ 6 = "back"; 42 = "back"; 60 = "front" }
$maskNames = @("chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "serratus", "traps", "upperBack", "lats", "lowerBack", "glutes", "quads", "adductors", "hamstrings", "calves")
$masks = @{}
foreach ($muscle in $maskNames) {
  foreach ($side in @("left", "right")) {
    $key = "$muscle|$side"
    $masks[$key] = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  }
}

$centerById = @{}
foreach ($center in $centers) { $centerById[$center.Id] = $center }

for ($index = 0; $index -lt $pixelCount; $index++) {
  $id = $labels[$index]
  if (-not $assignment.ContainsKey($id)) { continue }
  $x = $index % $width
  $center = $centerById[$id]
  $view = if ($center.X -lt 660) { "front" } else { "back" }

  if ($splitAtCenter.ContainsKey($id)) {
    if ($view -eq "front") { $side = if ($x -lt 358) { "right" } else { "left" } }
    else { $side = if ($x -lt 996) { "left" } else { "right" } }
  } elseif ($view -eq "front") {
    $side = if ($center.X -lt 358) { "right" } else { "left" }
  } else {
    $side = if ($center.X -lt 996) { "left" } else { "right" }
  }

  $y = [int][Math]::Floor($index / $width)
  foreach ($muscle in $assignment[$id]) {
    $masks["$muscle|$side"].SetPixel($x, $y, [System.Drawing.Color]::White)
  }
}

foreach ($muscle in $maskNames) {
  $slug = [Regex]::Replace($muscle, "([a-z0-9])([A-Z])", '$1-$2').ToLowerInvariant()
  foreach ($side in @("left", "right")) {
    $path = Join-Path $PSScriptRoot "muscle-mask-$slug-$side.png"
    $masks["$muscle|$side"].Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $masks["$muscle|$side"].Dispose()
  }
}

$source.Dispose()
Write-Output "Generated $($maskNames.Count * 2) seam-bounded muscle masks from $width x $height artwork."
