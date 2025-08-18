# RBAC Configuration for Performance Dashboard
# This script sets up role-based access control for the performance dashboard

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$ApplicationInsightsName,
    
    [Parameter(Mandatory=$true)]
    [string]$DashboardName,
    
    [Parameter(Mandatory=$false)]
    [string]$DevOpsGroupObjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$DevelopmentGroupObjectId
)

# Check if user is logged in to Azure
try {
    $context = Get-AzContext
    if (!$context) {
        Write-Host "Please login to Azure first using Connect-AzAccount" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Please install Azure PowerShell module: Install-Module -Name Az" -ForegroundColor Red
    exit 1
}

Write-Host "Setting up RBAC for Performance Dashboard..." -ForegroundColor Green

# Get resource IDs
$appInsightsResourceId = (Get-AzApplicationInsights -ResourceGroupName $ResourceGroupName -Name $ApplicationInsightsName).Id
$dashboardResourceId = "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName/providers/Microsoft.Portal/dashboards/$DashboardName"

# Define custom roles
$performanceViewerRole = @{
    Name = "Performance Dashboard Viewer"
    Description = "Can view performance dashboard and metrics"
    Actions = @(
        "Microsoft.Insights/components/read",
        "Microsoft.Insights/components/query/read",
        "Microsoft.Portal/dashboards/read"
    )
    NotActions = @()
    AssignableScopes = @(
        "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName"
    )
}

$performanceManagerRole = @{
    Name = "Performance Dashboard Manager"
    Description = "Can manage performance dashboard, alerts, and configurations"
    Actions = @(
        "Microsoft.Insights/components/*",
        "Microsoft.Portal/dashboards/*",
        "Microsoft.Insights/scheduledQueryRules/*",
        "Microsoft.Insights/actionGroups/*",
        "Microsoft.Logic/workflows/*"
    )
    NotActions = @()
    AssignableScopes = @(
        "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName"
    )
}

# Create custom roles
Write-Host "Creating custom roles..." -ForegroundColor Yellow

try {
    $viewerRole = New-AzRoleDefinition -InputFile (ConvertTo-Json $performanceViewerRole -Depth 10 | Out-File -FilePath "temp-viewer-role.json" -PassThru)
    $managerRole = New-AzRoleDefinition -InputFile (ConvertTo-Json $performanceManagerRole -Depth 10 | Out-File -FilePath "temp-manager-role.json" -PassThru)
    
    # Clean up temp files
    Remove-Item "temp-viewer-role.json" -ErrorAction SilentlyContinue
    Remove-Item "temp-manager-role.json" -ErrorAction SilentlyContinue
    
    Write-Host "Custom roles created successfully" -ForegroundColor Green
} catch {
    Write-Host "Error creating custom roles: $($_.Exception.Message)" -ForegroundColor Red
}

# Assign roles to groups
if ($DevOpsGroupObjectId) {
    Write-Host "Assigning Performance Dashboard Manager role to DevOps group..." -ForegroundColor Yellow
    try {
        New-AzRoleAssignment -ObjectId $DevOpsGroupObjectId -RoleDefinitionName "Performance Dashboard Manager" -Scope "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName"
        Write-Host "DevOps group assigned as Performance Dashboard Manager" -ForegroundColor Green
    } catch {
        Write-Host "Error assigning role to DevOps group: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($DevelopmentGroupObjectId) {
    Write-Host "Assigning Performance Dashboard Viewer role to Development group..." -ForegroundColor Yellow
    try {
        New-AzRoleAssignment -ObjectId $DevelopmentGroupObjectId -RoleDefinitionName "Performance Dashboard Viewer" -Scope "/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$ResourceGroupName"
        Write-Host "Development group assigned as Performance Dashboard Viewer" -ForegroundColor Green
    } catch {
        Write-Host "Error assigning role to Development group: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Create dashboard sharing configuration
Write-Host "Configuring dashboard sharing..." -ForegroundColor Yellow

$dashboardSharingConfig = @{
    shareScope = "ResourceGroup"
    permissions = @(
        @{
            principalId = $DevOpsGroupObjectId
            role = "Owner"
        },
        @{
            principalId = $DevelopmentGroupObjectId
            role = "Reader"
        }
    )
}

Write-Host "RBAC configuration completed successfully!" -ForegroundColor Green
Write-Host "Dashboard URL: https://portal.azure.com/#@/dashboard/arm$dashboardResourceId" -ForegroundColor Cyan