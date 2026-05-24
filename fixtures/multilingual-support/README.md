# Multilingual support fixtures

This directory stores the public multilingual coverage matrix and coverage-seed script fixtures.

- `coverage.v1.json` is the machine-readable tier matrix.
- `inputs/` contains script and language-family smoke inputs that do not claim task behavior until a task-specific expected-output and product-oracle gate is added.

These fixtures prevent broad multilingual claims from being inferred from a small number of Unicode or task smoke tests.
