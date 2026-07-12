# AssetFlow API — Documentation

## OpenAPI / Swagger

Interactive API docs are served at:

- **UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Raw JSON:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

The spec is generated at boot from JSDoc `@openapi` annotations found in
`src/routes/**/*.ts` and `src/controllers/**/*.ts`. Feature modules ship their
own docblocks so the spec grows automatically as endpoints are implemented.

## API Versioning

All endpoints are versioned under `/api/v1`. Future breaking changes will be
introduced under `/api/v2` without disturbing existing clients.

## Response Envelope

**Success**

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

**Failure**

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {},
  "code": "VALIDATION_ERROR"
}
```

## Health Endpoints

| Endpoint             | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `GET /api/v1/health` | Liveness probe with database, uptime, memory, version   |
| `GET /api/v1/version`| Service, API and Node runtime version                   |
| `GET /api/v1/status` | Extended runtime status                                 |

## Adding a New Endpoint

1. Add the route in `src/routes/v1/<feature>.route.ts`.
2. Add the controller in `src/controllers/<feature>.controller.ts`.
3. Add the service in `src/services/<feature>.service.ts`.
4. Add the repository in `src/repositories/<feature>.repository.ts`.
5. Add a zod validator under `src/validators/<feature>/`.
6. Annotate the route with `@openapi` JSDoc for Swagger.
7. Add a unit test under `tests/unit/` and/or `tests/integration/`.
