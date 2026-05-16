# Contributing to EvoGraph

Thanks for taking a look at EvoGraph. The project is early, so useful contributions include bug reports, clearer docs, reproducible demos, tests, and focused backend/frontend improvements.

## Local Setup

```bash
git clone https://github.com/liu66-qing/EvoGraph.git
cd EvoGraph
cp .env.example .env
docker-compose up -d
pip install -e ".[dev]"
cd frontend && npm install
```

Run checks before opening a pull request:

```bash
make test-unit
make lint
cd frontend && npm run build
```

## Good First Contributions

- Add seeded end-to-end demo data that works with the local Qdrant service.
- Add seeded demo data for the graph explorer and query console.
- Improve provenance display in query responses.
- Add tests around conflict detection and temporal graph behavior.
- Add screenshots or short demo GIFs to the README.
- Tighten API error handling and health checks.

## Pull Request Guidelines

- Keep changes focused and small enough to review.
- Add or update tests when behavior changes.
- Update README or docs when setup, APIs, or user-visible behavior changes.
- Mention any services or credentials needed to reproduce your change.

## Issue Guidelines

For bugs, include:

- What you expected to happen.
- What actually happened.
- Steps to reproduce.
- Logs, screenshots, or API responses if relevant.
- Your OS, Python version, Node version, and Docker version.

For feature requests, describe the use case first. Implementation ideas are welcome, but the problem being solved matters most.
