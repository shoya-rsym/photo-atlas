$Files = Get-ChildItem `
    -Path . `
    -Recurse `
    -Include *.md,*.ps1

Write-Host ""
Write-Host "====================================="
Write-Host "Encoding Check"
Write-Host "====================================="
Write-Host ""

foreach ($File in $Files)
{
    try {

        $Bytes = [System.IO.File]::ReadAllBytes($File.FullName)

        if ($Bytes.Length -ge 3 `
            -and $Bytes[0] -eq 0xEF `
            -and $Bytes[1] -eq 0xBB `
            -and $Bytes[2] -eq 0xBF)
        {
            $Encoding = "UTF-8 BOM"
        }
        elseif ($Bytes.Length -ge 2 `
            -and $Bytes[0] -eq 0xFF `
            -and $Bytes[1] -eq 0xFE)
        {
            $Encoding = "UTF-16 LE"
        }
        elseif ($Bytes.Length -ge 2 `
            -and $Bytes[0] -eq 0xFE `
            -and $Bytes[1] -eq 0xFF)
        {
            $Encoding = "UTF-16 BE"
        }
        else
        {
            try {

                $null = [System.Text.UTF8Encoding]::new($false,$true).GetString($Bytes)

                $Encoding = "UTF-8 (No BOM)"
            }
            catch {

                $Encoding = "ANSI / Shift-JIS?"
            }
        }

        "{0,-20} {1}" -f $Encoding, $File.FullName
    }
    catch {

        Write-Host "ERROR : $($File.FullName)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "====================================="
Write-Host "Check Complete"
Write-Host "====================================="

