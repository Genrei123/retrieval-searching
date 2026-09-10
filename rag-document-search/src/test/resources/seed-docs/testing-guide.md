# Testing Guide

## Unit Testing

Unit tests exercise a single class in isolation, with its collaborators replaced by mocks or
stubs, typically using Mockito's `@Mock` and `@InjectMocks` annotations in a plain JUnit 5
test class. These tests should run in milliseconds and require no Spring context, no database,
and no network access, which is what makes them cheap enough to run on every save.

## Integration Testing with Testcontainers

Integration tests need to verify behaviour that only shows up against a real dependency, and
for anything involving PostgreSQL full-text search this is not optional: generated `tsvector`
columns, `ts_rank_cd`, and `ts_headline` are Postgres-specific and cannot be exercised against
an in-memory database like H2, which will either reject the DDL outright or silently behave
differently. Testcontainers solves this by starting a real, disposable PostgreSQL instance in
Docker for the duration of the test run, giving high confidence that what passes in CI will
behave the same way in production. A typical setup annotates the test class with
`@SpringBootTest` and `@Testcontainers`, declares a `static PostgreSQLContainer`, and wires its
JDBC URL into the Spring context via `@DynamicPropertySource`.
