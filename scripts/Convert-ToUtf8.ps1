$Files = Get-ChildItem `
    -Path . `
    -Recurse `
    -Include *.md,*.ps1

foreach ($File in $Files)
{
    $Content = Get-Content `
        $File.FullName `
        -Raw

    Set-Content `
        $File.FullName `
        -Value $Content `
        -Encoding utf8
}

Write-Host "All files converted to UTF-8"

