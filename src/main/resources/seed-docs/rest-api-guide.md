# REST API Guide

## Building Controllers

A REST controller in Spring is declared with `@RestController`, which combines `@Controller`
and `@ResponseBody` so that return values are serialized directly into the HTTP response body,
typically as JSON via Jackson. Endpoint methods are mapped with `@GetMapping`, `@PostMapping`,
`@PutMapping`, `@PatchMapping`, and `@DeleteMapping`, and path variables and query parameters
are bound automatically with `@PathVariable` and `@RequestParam`.

Keeping controllers thin is a common piece of advice worth taking seriously: a controller
method should validate input, delegate to a service layer, and shape the response, without
containing business logic itself. This keeps the HTTP concerns separate from the domain logic
and makes both easier to test in isolation.

## Error Handling

Centralizing error handling with `@RestControllerAdvice` and `@ExceptionHandler` methods
avoids scattering try-catch blocks across every controller. A well-designed API returns a
consistent error body shape across all endpoints, typically including a machine-readable error
code, a human-readable message, and enough context to debug the failure, such as a request id.
HTTP status codes should be chosen deliberately: `400` for malformed or invalid client input,
`404` for a resource that does not exist, `409` for a conflicting state, and `503` when a
downstream dependency such as the database is unavailable.

## Validation

Bean Validation annotations such as `@NotNull`, `@Size`, and `@Pattern` can be applied to
request DTOs and triggered automatically by adding `@Valid` to a controller method parameter.
Validation failures are raised as a `MethodArgumentNotValidException`, which a
`@RestControllerAdvice` can catch and translate into a structured `400` response listing every
field that failed validation, rather than a generic stack trace.
