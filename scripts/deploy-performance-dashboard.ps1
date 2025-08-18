# Performance Dashboard Deployment Script
# Deploys dashboard, alerts, and automated reports to Azure

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ApplicationInsightsName,
    
    [Parameter(Mandatory=$true)]
    [string]$Location,
    
    [Parameter(Mandatory=$true)]
    [string]$AlertEmailAddress,
    
    [Parameter(Mandatory=$false)]
    [string]$SlackWebhookUrl = "",
    
    [Parameter(Mandatory=$false)]
    [string]$WeeklyReportEmail = $AlertEmailAddress
)

Write-Host "🚀 Deploying Performance Dashboard Components..." -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Application Insights: $ApplicationInsightsName" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan

# Check if resource group exists
$resourceGroup = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
if (!$resourceGroup) {
    Write-Host "❌ Resource group '$ResourceGroupName' not found" -ForegroundColor Red
    exit 1
}

# Check if Application Insights exists
$appInsights = Get-AzApplicationInsights -ResourceGroupName $ResourceGroupName -Name $ApplicationInsightsName -ErrorAction SilentlyContinue
if (!$appInsights) {
    Write-Host "❌ Application Insights '$ApplicationInsightsName' not found" -ForegroundColor Red
    exit 1
}

try {
    # Deploy dashboard
    Write-Host "📊 Deploying performance dashboard..." -ForegroundColor Yellow
    $dashboardDeployment = New-AzResourceGroupDeployment `
        -ResourceGroupName $ResourceGroupName `
        -TemplateFile "azure/performance-dashboard-template.json" `
        -applicationInsightsName $ApplicationInsightsName `
        -location $Location `
        -Verbose

    if ($dashboardDeployment.ProvisioningState -eq "Succeeded") {
        Write-Host "✅ Dashboard deployed successfully" -ForegroundColor Green
        $dashboardUrl = "https://portal.azure.com/#@/dashboard/arm$($dashboardDeployment.Outputs.dashboardResourceId.Value)"
        Write-Host "Dashboard URL: $dashboardUrl" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Dashboard deployment failed" -ForegroundColor Red
        exit 1
    }

    # Deploy alerts
    Write-Host "🚨 Deploying performance alerts..." -ForegroundColor Yellow
    $alertsDeployment = New-AzResourceGroupDeployment `
        -ResourceGroupName $ResourceGroupName `
        -TemplateFile "azure/performance-alerts-template.json" `
        -applicationInsightsName $ApplicationInsightsName `
        -emailAddress $AlertEmailAddress `
        -slackWebhookUrl $SlackWebhookUrl `
        -Verbose

    if ($alertsDeployment.ProvisioningState -eq "Succeeded") {
        Write-Host "✅ Alerts deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Alerts deployment failed" -ForegroundColor Red
        exit 1
    }

    # Deploy weekly report logic app (if email is configured)
    if ($WeeklyReportEmail) {
        Write-Host "📧 Deploying weekly report automation..." -ForegroundColor Yellow
        # Note: This requires additional setup for Office 365 connector
        Write-Host "⚠️  Weekly report requires manual Office 365 connector setup" -ForegroundColor Yellow
        Write-Host "   Please follow the documentation to complete setup" -ForegroundColor Yellow
    }

    Write-Host "🎉 Performance dashboard deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Visit dashboard: $dashboardUrl" -ForegroundColor White
    Write-Host "2. Configure RBAC using scripts/setup-rbac.ps1" -ForegroundColor White
    Write-Host "3. Test alerts by triggering performance violations" -ForegroundColor White
    Write-Host "4. Setup weekly report Office 365 connector (if enabled)" -ForegroundColor White
    Write-Host "5. Review documentation: docs/PERFORMANCE_DASHBOARD.md" -ForegroundColor White

} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}