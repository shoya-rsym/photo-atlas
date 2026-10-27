function Search-Rule {

    param(
        [string]$RuleName,
        [string]$Keyword
    )

    Write-Host ""
    Write-Host "[RULE] $RuleName"
    Write-Host "-------------------------------------"

    $Results = Get-ChildItem `
        -Path . `
        -Recurse `
        -Filter *.md |
    Select-String `
        -Pattern $Keyword

    if ($Results) {

        $Results |
        Select-Object -ExpandProperty Path -Unique
    }
    else {

        Write-Host "not found"
    }
}

Write-Host ""
Write-Host "====================================="
Write-Host "Document Consistency Check"
Write-Host "====================================="

Search-Rule "Photo Design" "Photo"
Search-Rule "SVG Design" "都道府県単位SVG"
Search-Rule "Snake Case" "snake_case"
Search-Rule "Created At" "createdAt"
Search-Rule "Character" "Character"
Search-Rule "JapanMapRegion" "JapanMapRegion"

Write-Host ""
Write-Host "====================================="
Write-Host "Consistency Check Complete"
Write-Host "====================================="