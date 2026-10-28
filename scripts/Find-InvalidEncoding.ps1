$Files = Get-ChildItem `
    -Path . `
    -Recurse `
    -Include *.md,*.ps1

Write-Host ""
Write-Host "====================================="
Write-Host "Invalid Encoding Check"
Write-Host "====================================="
Write-Host ""

foreach ($File in $Files)
{
    $Bytes = [System.IO.File]::ReadAllBytes($File.FullName)

    $Valid = $false

    if (
        $Bytes.Length -ge 3 `
        -and $Bytes[0] -eq 0xEF `
        -and $Bytes[1] -eq 0xBB `
        -and $Bytes[2] -eq 0xBF
    )
    {
        $Valid = $true
    }
    else
    {
        try
        {
            $null = [System.Text.UTF8Encoding]::new($false,$true).GetString($Bytes)
            $Valid = $true
        }
        catch
        {
            $Valid = $false
        }
    }

    if (-not $Valid)
    {
        Write-Host $File.FullName -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "====================================="
Write-Host "Check Complete"
Write-Host "====================================="

