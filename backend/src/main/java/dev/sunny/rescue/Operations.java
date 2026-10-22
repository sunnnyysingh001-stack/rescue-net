package dev.sunny.rescue;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class Operations {

  public record Incident(
    String id,
    String title,
    String location,
    String severity,
    String status,
    String teamId,
    int people
  ) {}

  public record Team(String id, String name, String specialty) {}

  public record Resource(String id, String name, int stock, String unit) {}

  public record Allocation(
    String incidentId,
    String resourceId,
    int quantity
  ) {}

  public record Event(String at, String actor, String message) {}

  public record State(
    List<Incident> incidents,
    List<Team> teams,
    List<Resource> resources,
    List<Allocation> allocations,
    List<Event> events
  ) {}

  private final StateRepository repo;
  private final ObjectMapper mapper;
  private final TransactionTemplate tx;

  public Operations(
    StateRepository repo,
    ObjectMapper mapper,
    TransactionTemplate tx
  ) {
    this.repo = repo;
    this.mapper = mapper;
    this.tx = tx;
  }

  @PostConstruct
  void initialize() {
    tx.execute(s -> {
      if (!repo.existsById(1L)) repo.save(new OperationState(encode(seed())));
      return null;
    });
  }

  static State seed() {
    return new State(
      new ArrayList<>(
        List.of(
          new Incident(
            "INC-1001",
            "Riverside flooding",
            "Gomti Nagar",
            "CRITICAL",
            "REPORTED",
            null,
            24
          ),
          new Incident(
            "INC-1002",
            "Road access blocked",
            "Aliganj",
            "HIGH",
            "REPORTED",
            null,
            12
          ),
          new Incident(
            "INC-1003",
            "Temporary shelter support",
            "Indira Nagar",
            "MEDIUM",
            "REPORTED",
            null,
            40
          )
        )
      ),
      new ArrayList<>(
        List.of(
          new Team("T-01", "Alpha Unit", "Water rescue"),
          new Team("T-02", "Bravo Unit", "Medical response"),
          new Team("T-03", "Charlie Unit", "Logistics")
        )
      ),
      new ArrayList<>(
        List.of(
          new Resource("R-01", "Drinking water", 240, "litres"),
          new Resource("R-02", "Medical kits", 30, "kits"),
          new Resource("R-03", "Relief meals", 180, "packs")
        )
      ),
      new ArrayList<>(),
      new ArrayList<>(
        List.of(
          new Event(
            Instant.now().toString(),
            "system",
            "Fictional sample scenario loaded"
          )
        )
      )
    );
  }

  public State get() {
    return decode(repo.findById(1L).orElseThrow().payload);
  }

  private State decode(String s) {
    try {
      return mapper.readValue(s, State.class);
    } catch (Exception e) {
      throw new IllegalStateException("Stored state invalid", e);
    }
  }

  private String encode(State s) {
    try {
      return mapper.writeValueAsString(s);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private State change(
    String actor,
    java.util.function.Consumer<State> action,
    String message
  ) {
    return tx.execute(status -> {
      var row = repo.lock(1L).orElseThrow();
      State s = decode(row.payload);
      action.accept(s);
      s.events().add(0, new Event(Instant.now().toString(), actor, message));
      if (s.events().size() > 100) s.events().remove(s.events().size() - 1);
      row.payload = encode(s);
      repo.saveAndFlush(row);
      return s;
    });
  }

  static void require(boolean b, String message) {
    if (!b) throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  static Incident incident(State s, String id) {
    return s
      .incidents()
      .stream()
      .filter(x -> x.id().equals(id))
      .findFirst()
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found")
      );
  }

  public State report(
    String actor,
    String title,
    String location,
    String severity,
    int people
  ) {
    return change(
      actor,
      s -> {
        require(s.incidents().size() < 500, "Demo incident limit reached");
        String id = "INC-" + UUID.randomUUID().toString().substring(0, 8);
        s.incidents().add(
          0,
          new Incident(
            id,
            title.trim(),
            location.trim(),
            severity,
            "REPORTED",
            null,
            people
          )
        );
      },
      "Reported: " + title.trim()
    );
  }

  public State dispatch(String actor, String id, String teamId) {
    return change(
      actor,
      s -> {
        var i = incident(s, id);
        require(
          i.status().equals("REPORTED"),
          "Only reported incidents can be dispatched"
        );
        require(
          s
            .teams()
            .stream()
            .anyMatch(t -> t.id().equals(teamId)),
          "Unknown team"
        );
        require(
          s
            .incidents()
            .stream()
            .noneMatch(
              x -> teamId.equals(x.teamId()) && !x.status().equals("RESOLVED")
            ),
          "Team is already assigned"
        );
        s.incidents().set(
          s.incidents().indexOf(i),
          new Incident(
            i.id(),
            i.title(),
            i.location(),
            i.severity(),
            "DISPATCHED",
            teamId,
            i.people()
          )
        );
      },
      "Dispatched " + teamId + " to " + id
    );
  }

  public State advance(String actor, String id) {
    return change(
      actor,
      s -> {
        var i = incident(s, id);
        String next = switch (i.status()) {
          case "DISPATCHED" -> "ON_SITE";
          case "ON_SITE" -> "RESOLVED";
          default -> throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Dispatch before advancing; resolved incidents are final"
          );
        };
        s.incidents().set(
          s.incidents().indexOf(i),
          new Incident(
            i.id(),
            i.title(),
            i.location(),
            i.severity(),
            next,
            i.teamId(),
            i.people()
          )
        );
      },
      "Advanced " + id
    );
  }

  public State allocate(
    String actor,
    String id,
    String resourceId,
    int quantity
  ) {
    return change(
      actor,
      s -> {
        var i = incident(s, id);
        require(
          !i.status().equals("RESOLVED"),
          "Cannot allocate to a resolved incident"
        );
        var r = s
          .resources()
          .stream()
          .filter(x -> x.id().equals(resourceId))
          .findFirst()
          .orElseThrow(() ->
            new ResponseStatusException(
              HttpStatus.NOT_FOUND,
              "Resource not found"
            )
          );
        require(
          quantity > 0 && quantity <= r.stock(),
          "Insufficient stock or invalid quantity"
        );
        s.resources().set(
          s.resources().indexOf(r),
          new Resource(r.id(), r.name(), r.stock() - quantity, r.unit())
        );
        s.allocations().add(new Allocation(id, resourceId, quantity));
      },
      "Allocated " + quantity + " of " + resourceId + " to " + id
    );
  }
}
