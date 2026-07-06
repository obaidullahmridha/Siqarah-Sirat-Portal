# Resolve workspace path and find CSV file dynamically using headers to bypass encoding issues
$downloadsFolder = "c:\Users\obaid\Downloads"
$workspace = $PSScriptRoot

# Copy logo assets dynamically
$logoSvg = Get-ChildItem -Path $downloadsFolder -Filter "*Logo.svg" | Select-Object -First 1
if ($logoSvg) {
    Copy-Item -Path $logoSvg.FullName -Destination "$workspace\logo.svg" -Force
}
$logoPng = Get-ChildItem -Path $downloadsFolder -Filter "*Logo.png" | Select-Object -First 1
if ($logoPng) {
    Copy-Item -Path $logoPng.FullName -Destination "$workspace\logo.png" -Force
}

# Resolve CSV path dynamically - look for any CSV containing "Junior Section" in headers
$csvFile = Get-ChildItem -Path $downloadsFolder -Filter "*.csv" | ForEach-Object {
    try {
        $firstLine = Get-Content -Path $_.FullName -TotalCount 1 -ErrorAction SilentlyContinue
        if ($firstLine -and $firstLine -match "Junior Section") {
            $_
        }
    } catch {}
} | Select-Object -First 1

if (-not $csvFile) {
    Write-Error "Could not find Seerah CSV file in Downloads folder."
    exit 1
}

$csvPath = $csvFile.FullName
Write-Host "Found CSV at: $csvPath"

# Parse CSV
$data = Import-Csv -Path $csvPath -Encoding UTF8 | ForEach-Object {
    $sn = $_.SN.Trim()
    $jr = $_.'Junior Section'.Trim().ToUpper() -eq 'TRUE'
    $sr = $_.'Senior Section'.Trim().ToUpper() -eq 'TRUE'
    $tg = $_.'Teacher - Guardian'.Trim().ToUpper() -eq 'TRUE'
    $q = $_.question.Trim()
    $a = $_.answer.Trim()
    $ip = $_.image_prompt.Trim()
    
    # Patch row 8 refusal
    if ($sn -eq '8' -and $ip -like "*learning*") {
        $ip = "An elegant illustration of the Kaaba in ancient Makkah during the day, set in a peaceful desert valley. The style is respectful, historic, and suitable for an educational Islamic context."
    }
    
    [PSCustomObject]@{
        SN = [int]$sn
        JuniorSection = $jr
        SeniorSection = $sr
        TeacherGuardian = $tg
        question = $q
        answer = $a
        image_prompt = $ip
    }
}

# Convert to JSON and save as data.js using UTF8
$json = $data | ConvertTo-Json -Depth 5 -Compress
$jsContent = "const seerahData = " + $json + ";"
[System.IO.File]::WriteAllText("$workspace\data.js", $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "Data parsing complete. Total records: $($data.Count)"
