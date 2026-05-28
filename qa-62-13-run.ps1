$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3001/api/v1'
function Json($value) { $value | ConvertTo-Json -Depth 10 }
function Invoke-Case($name, $method, $path, $headers=$null, $body=$null, $expect=@()) {
  try {
    $params = @{ Method=$method; Uri="$base$path" }
    if ($headers) { $params.Headers = $headers }
    if ($body) { $params.Body = (Json $body); $params.ContentType = 'application/json' }
    $result = Invoke-RestMethod @params
    $status = 200
    if ($method -eq 'POST') { $status = 200 }
    [pscustomobject]@{ Case=$name; Status=$status; Expected=($expect -join '/'); Ok=($expect.Count -eq 0 -or $expect -contains $status); Notes='OK' }
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    [pscustomobject]@{ Case=$name; Status=$status; Expected=($expect -join '/'); Ok=($expect -contains $status); Notes=$_.Exception.Message }
  }
}
$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body (Json @{ email='admin@bitacora.local'; password='Password123!' }) -ContentType 'application/json'
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
$invalidHeaders = @{ Authorization = 'Bearer token-invalido' }
$adminProjects = @(Invoke-RestMethod -Method Get -Uri "$base/projects" -Headers $adminHeaders)
$activeProject = $adminProjects | Where-Object { $_.status -eq 'ACTIVE' } | Select-Object -First 1
$unassignedProject = $adminProjects | Where-Object { $_.id -ne $activeProject.id } | Select-Object -First 1
$roles = @(Invoke-RestMethod -Method Get -Uri "$base/roles/assignable" -Headers $adminHeaders)
$viewerRole = $roles | Where-Object { $_.code -eq 'VIEWER' } | Select-Object -First 1
$usersBefore = Invoke-RestMethod -Method Get -Uri "$base/users?limit=100" -Headers $adminHeaders
$adminId = $adminLogin.user.id
$dailyLogs = Invoke-RestMethod -Method Get -Uri "$base/daily-logs?limit=100" -Headers $adminHeaders
$dailyLog = @($dailyLogs.items | Where-Object { $_.projectId -eq $activeProject.id } | Select-Object -First 1)[0]
if (-not $dailyLog) { $dailyLog = @($dailyLogs.items | Select-Object -First 1)[0] }
$tempEmail = 'qa62.13.viewer@bitacora.local'
try {
  $temp = Invoke-RestMethod -Method Post -Uri "$base/users" -Headers $adminHeaders -Body (Json @{ fullName='QA 62.13 Viewer'; email=$tempEmail; password='Password123!'; status='ACTIVE' }) -ContentType 'application/json'
} catch {
  $found = Invoke-RestMethod -Method Get -Uri "$base/users?search=qa62.13.viewer&limit=10" -Headers $adminHeaders
  $temp = $found.items[0]
  Invoke-RestMethod -Method Patch -Uri "$base/users/$($temp.id)/status" -Headers $adminHeaders -Body (Json @{ status='ACTIVE'; reason='QA setup' }) -ContentType 'application/json' | Out-Null
}
Invoke-RestMethod -Method Patch -Uri "$base/users/$($temp.id)/roles" -Headers $adminHeaders -Body (Json @{ assignments=@(@{ projectId=$activeProject.id; roleId=$viewerRole.id }) }) -ContentType 'application/json' | Out-Null
$viewerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body (Json @{ email=$tempEmail; password='Password123!' }) -ContentType 'application/json'
$viewerHeaders = @{ Authorization = "Bearer $($viewerLogin.accessToken)" }
$cases = @()
$privatePaths = @('/users','/roles/assignable','/projects','/daily-logs','/events','/daily-log-events','/dashboard/metrics')
foreach ($path in $privatePaths) { $cases += Invoke-Case "NO_TOKEN $path" 'GET' $path $null $null @(401) }
foreach ($path in $privatePaths) { $cases += Invoke-Case "BAD_TOKEN $path" 'GET' $path $invalidHeaders $null @(401) }
$cases += Invoke-Case 'PUBLIC_VERIFY without login mismatch allowed' 'GET' "/public/daily-logs/$($dailyLog.id)/verification?code=CODIGO_INVALIDO" $null $null @(200)
$cases += Invoke-Case 'VIEWER cannot list users' 'GET' '/users' $viewerHeaders $null @(403)
$cases += Invoke-Case 'VIEWER cannot roles assignable' 'GET' '/roles/assignable' $viewerHeaders $null @(403)
$cases += Invoke-Case 'VIEWER cannot assign roles' 'PATCH' "/users/$($temp.id)/roles" $viewerHeaders @{ assignments=@() } @(403)
$cases += Invoke-Case 'VIEWER cannot invalidate sessions' 'POST' "/users/$($temp.id)/invalidate-sessions" $viewerHeaders $null @(403)
$cases += Invoke-Case 'NO_TOKEN cannot create user' 'POST' '/users' $null @{ fullName='No Token'; email='no-token@example.com'; password='Password123!'; status='ACTIVE' } @(401)
$cases += Invoke-Case 'NO_TOKEN cannot update user' 'PATCH' "/users/$($temp.id)" $null @{ fullName='No Token' } @(401)
$cases += Invoke-Case 'NO_TOKEN cannot delete user' 'DELETE' "/users/$($temp.id)" $null $null @(401)
if ($unassignedProject) {
  $cases += Invoke-Case 'VIEWER direct unassigned project denied' 'GET' "/projects/$($unassignedProject.id)" $viewerHeaders $null @(404)
}
$cases += Invoke-Case 'VIEWER assigned project list OK' 'GET' '/projects' $viewerHeaders $null @(200)
$cases += Invoke-Case 'VIEWER daily logs scoped OK' 'GET' '/daily-logs?limit=100' $viewerHeaders $null @(200)
$cases += Invoke-Case 'VIEWER events scoped OK' 'GET' '/events?limit=100' $viewerHeaders $null @(200)
$cases += Invoke-Case 'VIEWER daily-log-events scoped OK' 'GET' '/daily-log-events?limit=100' $viewerHeaders $null @(200)
$cases += Invoke-Case 'VIEWER dashboard scoped OK' 'GET' '/dashboard/metrics' $viewerHeaders $null @(200)
if ($dailyLog) {
  $cases += Invoke-Case 'VIEWER audit assigned daily log OK' 'GET' "/daily-logs/$($dailyLog.id)/audit" $viewerHeaders $null @(200)
  $cases += Invoke-Case 'VIEWER PDF assigned daily log OK' 'GET' "/daily-logs/$($dailyLog.id)/pdf" $viewerHeaders $null @(200)
  $cases += Invoke-Case 'VIEWER signatures assigned daily log OK' 'GET' "/daily-logs/$($dailyLog.id)/signatures" $viewerHeaders $null @(200)
}
$cases += Invoke-Case 'LAST_ADMIN role removal blocked' 'PATCH' "/users/$adminId/roles" $adminHeaders @{ assignments=@() } @(409)
$viewerProjects = @(Invoke-RestMethod -Method Get -Uri "$base/projects" -Headers $viewerHeaders)
$viewerDashboard = Invoke-RestMethod -Method Get -Uri "$base/dashboard/metrics" -Headers $viewerHeaders
$viewerDle = Invoke-RestMethod -Method Get -Uri "$base/daily-log-events?limit=100" -Headers $viewerHeaders
# Cleanup temp user
Invoke-RestMethod -Method Patch -Uri "$base/users/$($temp.id)/roles" -Headers $adminHeaders -Body (Json @{ assignments=@() }) -ContentType 'application/json' | Out-Null
Invoke-RestMethod -Method Delete -Uri "$base/users/$($temp.id)" -Headers $adminHeaders | Out-Null
[pscustomobject]@{
  ActiveProject = $activeProject.code
  UnassignedProject = $unassignedProject.code
  DailyLogId = $dailyLog.id
  Cases = $cases
  ViewerProjectsCount = $viewerProjects.Count
  ViewerProjectCodes = @($viewerProjects | ForEach-Object { $_.code })
  ViewerDashboardActiveProjects = $viewerDashboard.activeProjects
  ViewerDailyLogEventsTotal = $viewerDle.meta.total
} | ConvertTo-Json -Depth 8
