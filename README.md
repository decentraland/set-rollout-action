# set-rollout-action

Usage:

```yml

- name: Set Rollout - Staging
    uses: decentraland/set-rollout-action@main
    with:
      token: ${{ secrets.GITHUB_TOKEN }}

      # Repo deployment info
      ref: ${{ github.event.deployment.ref }}
      sha: ${{ github.event.deployment.sha }}

      # CDN information
      packageName: ${{ github.event.deployment.payload.packageName }}
      packageVersion: ${{ github.event.deployment.payload.packageVersion }}

      # Rollout information
      deploymentPath: "profile"
      deploymentEnvironment: "zone"
      deploymentName: "_site"
      percentage: 100
```
