// Main Bicep Orchestration File for Sagacity Solutions Portal Infrastructure
targetScope = 'subscription'

@description('Location for all resources.')
param location string = 'westus2'

@description('Environment name prefix.')
param environmentName string = 'prod'

@description('PostgreSQL Administrator Login.')
param adminUsername string = 'portaladmin'

@description('PostgreSQL Administrator Password.')
@secure()
param adminPassword string

var resourceGroupName = 'rg-sagacity-${environmentName}'

// 1. Create Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
}

// 2. Provision Core Portal Infrastructure inside Resource Group
module portalResources 'modules/portal.bicep' = {
  name: 'portalResourcesDeployment'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
    adminUsername: adminUsername
    adminPassword: adminPassword
  }
}

output staticWebAppDefaultHostName string = portalResources.outputs.staticWebAppDefaultHostName
output containerAppsEnvironmentFqdn string = portalResources.outputs.containerAppsEnvironmentFqdn
