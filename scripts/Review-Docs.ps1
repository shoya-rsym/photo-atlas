[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

$Docs = @(
    "README.md",
    "AGENTS.md",

    "docs/01_project-overview.md",
    "docs/02_architecture.md",
    "docs/03_data-model.md",
    "docs/04_routing.md",
    "docs/05_ui-spec.md",
    "docs/06_feature-spec.md",
    "docs/07_future-features.md",
    "docs/08_ai-developer-instructions.md",
    "docs/09_wireframes.md",
    "docs/10_user-flow.md",
    "docs/11_component-design.md",
    "docs/12_json-examples.md",
    "docs/13_acceptance-criteria.md",
    "docs/14_navigation-rules.md",
    "docs/15_error-handling.md",
    "docs/17_content-guidelines.md",
    "docs/18_data-validation.md",
    "docs/19_mvp-scope.md",
    "docs/20_image-management.md",
    "docs/22_statistics-rules.md",
    "docs/99_copilot-task-list.md"
)

Write-Output ""
Write-Output "====================================="
Write-Output "ARフォト図鑑 ドキュメントレビュー"
Write-Output "====================================="
Write-Output ""

Write-Output "[1] ファイル存在確認"
Write-Output "-------------------------------------"

foreach ($File in $Docs)
{
    if (Test-Path $File)
    {
        Write-Output "OK : $File"
    }
    else
    {
        Write-Output "NG : $File"
    }
}

Write-Output ""
Write-Output "[2] 行数確認"
Write-Output "-------------------------------------"

foreach ($File in $Docs)
{
    if (Test-Path $File)
    {
        $LineCount = (Get-Content $File).Count

        "{0,6}  {1}" -f $LineCount, $File
    }
}

Write-Output ""
Write-Output "[3] ドキュメント内容"
Write-Output "-------------------------------------"

foreach ($File in $Docs)
{
    if (!(Test-Path $File))
    {
        continue
    }

    Write-Output ""
    Write-Output "===================================================="
    Write-Output $File
    Write-Output "===================================================="
    Write-Output ""

    Get-Content $File
}
