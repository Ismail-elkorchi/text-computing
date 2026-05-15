# Multilingual support fixtures

This directory stores the public multilingual support-tier matrix and readiness-only script fixtures.

- `tier-matrix.v1.json` is the machine-readable tier matrix.
- `inputs/` contains script smoke inputs that do not claim task behavior until a task-specific expected-output and comparator gate is added.

These fixtures prevent broad multilingual claims from being inferred from a small number of Unicode or task smoke tests.
