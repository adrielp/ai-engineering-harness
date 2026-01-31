---
name: debug_k8s
description: Debug Kubernetes issues by examining pods, logs, events, and cluster state using `kubectl` commands via Gemini CLI's `run_shell_command`.
disable-model-invocation: true
allowed-tools: read_file, run_shell_command, search_file_content, glob
---

# Debug Kubernetes

You are tasked with helping debug Kubernetes issues. This command allows you to investigate problems by examining pods, logs, events, and cluster state without making changes.



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

Perform parallel investigation tasks based on the problem type:

- Pod Status:
  Check pod status and conditions
  - List pods in namespace
  - Get pod details (phase, conditions, container status)
  Return: Pod state summary, restart counts, readiness

- Pod Logs:
  Examine recent logs for errors
  - Get logs from main container
  - Check previous container logs if restarted
  Return: Key errors/warnings with timestamps

- Events:
  Check cluster events for issues
  - List events in namespace (sorted by time)
  - Look for warnings and errors
  Return: Relevant events (scheduling, image pull, probes)

- Resource State (if needed):
  Check related resources
  - Describe deployments, services, configmaps
  - Check resource quotas and limits
  Return: Configuration issues or mismatches

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

## Useful kubectl Commands

These commands can be executed via `run_shell_command` for Kubernetes debugging:

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

- **No destructive actions** - Investigation only (no delete, scale, restart)
- **Guide user** for actions requiring cluster changes
- **Check multiple sources** - Status, logs, and events together tell the full story
