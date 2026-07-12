# AssetFlow API — Tests

- `tests/unit/` — pure unit tests (utilities, validators, error mapping).
- `tests/integration/` — endpoint tests that boot the Express app and exercise
  request/response contracts via supertest. Integration tests avoid touching
  the real database; feature suites will provide test doubles as they arrive.

Run the suite with:

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # coverage report in ./coverage
```
