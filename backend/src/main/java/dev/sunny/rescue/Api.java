package dev.sunny.rescue;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class Api {

  private final Operations ops;

  public Api(Operations ops) {
    this.ops = ops;
  }

  record Report(
    @NotBlank @Size(max = 100) String title,
    @NotBlank @Size(max = 100) String location,
    @Pattern(regexp = "CRITICAL|HIGH|MEDIUM|LOW") @NotNull String severity,
    @Min(1) @Max(100000) int people
  ) {}

  record Dispatch(@NotBlank String teamId) {}

  record Allocate(
    @NotBlank String resourceId,
    @Min(1) @Max(100000) int quantity
  ) {}

  @GetMapping("/state")
  Operations.State state() {
    return ops.get();
  }

  @PostMapping("/incidents")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  Operations.State report(Authentication a, @Valid @RequestBody Report r) {
    return ops.report(
      a.getName(),
      r.title(),
      r.location(),
      r.severity(),
      r.people()
    );
  }

  @PostMapping("/incidents/{id}/dispatch")
  Operations.State dispatch(
    Authentication a,
    @PathVariable String id,
    @Valid @RequestBody Dispatch d
  ) {
    return ops.dispatch(a.getName(), id, d.teamId());
  }

  @PostMapping("/incidents/{id}/advance")
  Operations.State advance(Authentication a, @PathVariable String id) {
    return ops.advance(a.getName(), id);
  }

  @PostMapping("/incidents/{id}/allocations")
  Operations.State allocate(
    Authentication a,
    @PathVariable String id,
    @Valid @RequestBody Allocate d
  ) {
    return ops.allocate(a.getName(), id, d.resourceId(), d.quantity());
  }
}
