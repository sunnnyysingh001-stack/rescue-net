package dev.sunny.rescue;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
class Auth {

  private final JwtEncoder encoder;
  private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
  private final Map<String, String> passwords;

  Auth(
    JwtEncoder encoder,
    @Value("${app.coordinator-password}") String c,
    @Value("${app.viewer-password}") String v
  ) {
    if (c.length() < 12 || v.length() < 12) throw new IllegalArgumentException(
      "Demo passwords must contain at least 12 characters"
    );
    this.encoder = encoder;
    passwords = Map.of(
      "coordinator",
      bcrypt.encode(c),
      "viewer",
      bcrypt.encode(v)
    );
  }

  record Login(
    @NotBlank @Size(max = 50) String username,
    @NotBlank @Size(max = 200) String password
  ) {}

  @PostMapping("/login")
  Map<String, String> login(@Valid @RequestBody Login r) {
    String hash = passwords.get(r.username());
    if (
      hash == null || !bcrypt.matches(r.password(), hash)
    ) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED,
      "Invalid credentials"
    );
    String role = r.username().equals("coordinator") ? "COORDINATOR" : "VIEWER";
    Instant now = Instant.now();
    var claims = JwtClaimsSet.builder()
      .issuer("rescue-net")
      .subject(r.username())
      .issuedAt(now)
      .expiresAt(now.plusSeconds(1800))
      .claim("role", role)
      .build();
    String token = encoder
      .encode(
        JwtEncoderParameters.from(
          JwsHeader.with(MacAlgorithm.HS256).build(),
          claims
        )
      )
      .getTokenValue();
    return Map.of("token", token, "role", role);
  }
}
