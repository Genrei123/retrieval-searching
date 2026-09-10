# Spring Framework

## Web

### Spring MVC

The Spring Web MVC framework is designed around a central `DispatcherServlet` that handles
all incoming HTTP requests and dispatches them to registered handlers. It is the traditional,
synchronous, servlet-based web stack in Spring and remains the default choice for most web
applications and REST APIs. Controllers are plain Java classes annotated with `@Controller`
or `@RestController`, and request mappings are declared with `@RequestMapping` and its
shortcut variants such as `@GetMapping` and `@PostMapping`.

Spring MVC integrates tightly with the Servlet API, which means it runs on any compliant
servlet container such as Tomcat, Jetty, or Undertow, and it benefits from the large existing
ecosystem of servlet filters, listeners, and container-level tooling. View resolution,
content negotiation, exception handling via `@ExceptionHandler`, and validation via the
Bean Validation API are all first-class concerns of the framework.

### Spring WebFlux

Spring WebFlux is the reactive, non-blocking alternative to Spring MVC, built on Project
Reactor. Instead of a thread-per-request model, WebFlux uses a small, fixed number of event
loop threads to handle a much larger number of concurrent connections, which suits workloads
dominated by I/O waits such as calls to other services. WebFlux can run on a servlet container
via the Servlet 3.1+ async support, or on non-servlet runtimes such as Netty or Undertow
directly.

Choosing between Spring MVC and WebFlux is primarily a question of the application's
concurrency profile rather than raw performance: most CRUD applications with a small number
of downstream calls see little practical benefit from reactive programming, while services
that fan out to many concurrent downstream calls, or that need to support very large numbers
of long-lived connections, benefit substantially.

## Data Access

### Spring Data JPA

Spring Data JPA reduces the boilerplate involved in writing a data access layer on top of
JPA and Hibernate. Repository interfaces that extend `JpaRepository` get a full set of CRUD
methods for free, and additional query methods can be derived automatically from method
names, such as `findByLastNameAndActiveTrue`, or defined explicitly with the `@Query`
annotation using JPQL or native SQL.

For read-heavy or reporting-style access where an ORM's object-relational mapping overhead
is unnecessary, plain `JdbcTemplate` or `NamedParameterJdbcTemplate` remains available and is
often the simpler, more predictable choice, particularly when the query needs to use
database-specific features that do not map cleanly onto an entity model, such as
PostgreSQL's full-text search functions or generated columns.

## Core

### Dependency Injection

The Spring IoC container manages the lifecycle and wiring of application beans. Constructor
injection is the recommended style because it makes required dependencies explicit and
allows fields to be declared `final`, whereas field injection via `@Autowired` on a field
hides dependencies and complicates testing. Beans are typically declared with stereotype
annotations such as `@Component`, `@Service`, and `@Repository`, or produced explicitly from
`@Configuration` classes using `@Bean` methods.
