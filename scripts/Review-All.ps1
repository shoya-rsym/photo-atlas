[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Output ""
Write-Output "============================="
Write-Output "Document Review Start"
Write-Output "============================="

& "$PSScriptRoot\Review-Docs.ps1"

& "$PSScriptRoot\Check-DocConsistency.ps1"

Write-Output ""
Write-Output "============================="
Write-Output "Review Complete"
Write-Output "============================="

