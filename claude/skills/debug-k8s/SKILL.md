---
name: debug-k8s
description: Debug Kubernetes issues by examining pods, logs, events, and cluster state
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob, mcp__kubernetes__*
---

# Debug Kubernetes

You are tasked with helping debug Kubernetes issues. This command allows you to investigate problems by examining pods, logs, events, and cluster state without making changes.

## MCP Server Preference

**When the Kubernetes MCP server is available**, prefer using MCP tools:
- `mcp__kubernetes__list_pods` - List pods in a namespace
- `mcp__kubernetes__get_pod` - Get pod details
- `mcp__kubernetes__get_logs` - Get pod logs
- `mcp__kubernetes__list_events` - List cluster events
- `mcp__kubernetes__describe_resource` - Describe any resource

**When MCP is unavailable**, fall back to kubectl commands via Bash.

To check if MCP is available, attempt an MCP tool first. If it fails with "tool not found", use kubectl.

## Initial Response

When invoked WITH a context (namespace, pod name, or resource):
```
I'll help debug Kubernetes issues with [resource]. Let me check the cluster state.

What specific problem are you encountering?
- Pod not starting?
- Application errors?
- Network/connectivity issues?
- Resource constraints?

I'll investigate the pods, logs, and events to help identify the issue.
```

When invoked WITHOUT parameters:
```
I'll help debug your Kubernetes issue.

Please provide some context:
- Which namespace?
- Which pod/deployment/service?
- What's the expected vs actual behavior?

I can investigate pod status, logs, events, and resource state.
```

## Process Steps

### Step 1: Understand the Problem

1. **Get context from user** (namespace, resource name, symptoms)
2. **Quick cluster check**:
   - Current kubectl context
   - Target namespace

### Step 2: Investigate the Issue

Spawn parallel Task agents based on the problem type:

```
Task 1 - Pod Status:
Check pod status and conditions
- List pods in namespace
- Get pod details (phase, conditions, container status)
Return: Pod state summary, restart counts, readiness
```

```
Task 2 - Pod Logs:
Examine recent logs for errors
- Get logs from main container
- Check previous container logs if restarted
Return: Key errors/warnings with timestamps
```

```
Task 3 - Events:
Check cluster events for issues
- List events in namespace (sorted by time)
- Look for warnings and errors
Return: Relevant events (scheduling, image pull, probes)
```

```
Task 4 - Resource State (if needed):
Check related resources
- Describe deployments, services, configmaps
- Check resource quotas and limits
Return: Configuration issues or mismatches
```

### Step 3: Present Findings

```markdown
## Kubernetes Debug Report

### Cluster Context
- **Context**: [kubectl context]
- **Namespace**: [namespace]
- **Resource**: [pod/deployment/service name]

### What's Wrong
[Clear statement of the issue]

### Evidence Found

**Pod Status**:
- Status: [Running/Pending/CrashLoopBackOff/etc]
- Restarts: [count]
- Conditions: [Ready/NotReady, reasons]

**From Logs**:
- [Error/warning with timestamp]
- [Stack traces or error messages]

**From Events**:
- [Recent events related to the issue]
- [Scheduling, image pull, probe failures]

**Resource State**:
- [ConfigMap/Secret issues]
- [Resource limit problems]
- [Service selector mismatches]

### Root Cause
[Most likely explanation]

### Recommended Actions

1. **Immediate Fix**:
   ```bash
   kubectl [specific command]
   ```

2. **If That Doesn't Work**:
   - [Alternative approach]

3. **Longer-term Fix**:
   - [Configuration changes needed]

### Common Issues Checklist
- [ ] Image exists and is pullable
- [ ] Resource requests/limits appropriate
- [ ] Probes configured correctly
- [ ] ConfigMaps/Secrets exist
- [ ] Service selectors match pod labels
- [ ] Network policies allow traffic

Would you like me to investigate something specific further?
```

## Useful kubectl Commands (Fallback)

When MCP is unavailable, use these:

```bash
# Context and namespace
kubectl config current-context
kubectl get ns

# Pod investigation
kubectl get pods -n <ns> -o wide
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns> --tail=100
kubectl logs <pod> -n <ns> --previous  # Previous container

# Events
kubectl get events -n <ns> --sort-by='.lastTimestamp'

# Resources
kubectl get deploy,svc,cm,secret -n <ns>
kubectl describe deploy <name> -n <ns>

# Debug containers
kubectl run debug --image=busybox -it --rm -- sh
kubectl exec -it <pod> -n <ns> -- sh
```

## Important Notes

- **Prefer MCP tools** when available for better structured data
- **Fall back to kubectl** seamlessly when MCP is unavailable
- **No destructive actions** - Investigation only (no delete, scale, restart)
- **Guide user** for actions requiring cluster changes
- **Check multiple sources** - Status, logs, and events together tell the full story
